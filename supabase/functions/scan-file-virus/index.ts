import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const METADEFENDER_API_KEY = Deno.env.get('METADEFENDER_API_KEY');
const METADEFENDER_API_URL = 'https://api.metadefender.com/v4';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Max file size for scanning: 140MB (MetaDefender limit)
const MAX_SCAN_SIZE = 140 * 1024 * 1024;

interface ScanResult {
  isClean: boolean;
  scanId?: string;
  threatFound?: string;
  threatType?: string;
  scanProgress?: number;
  error?: string;
  skipped?: boolean;
  quarantined?: boolean;
  quarantineId?: string;
}

// Upload file to MetaDefender for scanning
async function uploadFileForScan(fileData: ArrayBuffer, fileName: string): Promise<string> {
  console.log(`Uploading file for scan: ${fileName}, size: ${fileData.byteLength} bytes`);
  
  const response = await fetch(`${METADEFENDER_API_URL}/file`, {
    method: 'POST',
    headers: {
      'apikey': METADEFENDER_API_KEY!,
      'Content-Type': 'application/octet-stream',
      'filename': fileName,
    },
    body: fileData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MetaDefender upload error:', errorText);
    throw new Error(`Failed to upload file for scan: ${response.status}`);
  }

  const result = await response.json();
  console.log('Upload response:', result);
  return result.data_id;
}

// Get scan result from MetaDefender
async function getScanResult(dataId: string): Promise<ScanResult> {
  console.log(`Getting scan result for: ${dataId}`);
  
  const response = await fetch(`${METADEFENDER_API_URL}/file/${dataId}`, {
    method: 'GET',
    headers: {
      'apikey': METADEFENDER_API_KEY!,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MetaDefender scan result error:', errorText);
    throw new Error(`Failed to get scan result: ${response.status}`);
  }

  const result = await response.json();
  console.log('Scan result:', JSON.stringify(result, null, 2));

  const scanProgress = result.scan_results?.progress_percentage || 0;
  
  if (scanProgress < 100) {
    return {
      isClean: false, // SECURITY: Not clean until scan completes
      scanId: dataId,
      scanProgress,
    };
  }

  // scan_all_result_i: 0 = Clean, 1 = Infected, 2 = Suspicious, 3+ = Unknown/Error
  const scanAllResult = result.scan_results?.scan_all_result_i;
  const isClean = scanAllResult === 0;
  const isSuspicious = scanAllResult === 2 || scanAllResult >= 3;
  
  let threatFound: string | undefined;
  let threatType: string | undefined;
  
  if (!isClean && result.scan_results?.scan_details) {
    const threats = Object.entries(result.scan_results.scan_details)
      .filter(([_, detail]: [string, any]) => detail.threat_found)
      .map(([engine, detail]: [string, any]) => ({
        engine,
        threat: detail.threat_found
      }));
    
    if (threats.length > 0) {
      threatFound = threats.map(t => `${t.engine}: ${t.threat}`).join(', ');
      // Determine threat type from first detection
      threatType = threats[0].threat;
    }
  }

  // If suspicious but no specific threat found, mark as unknown
  if (isSuspicious && !threatFound) {
    threatType = 'suspicious_unknown';
  }

  return {
    isClean,
    scanId: dataId,
    threatFound,
    threatType,
    scanProgress: 100,
  };
}

// Wait for scan to complete with polling
async function waitForScanComplete(dataId: string, maxAttempts = 30): Promise<ScanResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getScanResult(dataId);
    
    if (result.scanProgress === 100) {
      return result;
    }
    
    console.log(`Scan in progress: ${result.scanProgress}%, attempt ${attempt + 1}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // SECURITY: Fail closed - treat timeout as suspicious
  return {
    isClean: false,
    threatType: 'scan_timeout',
    error: 'Scan timeout: file analysis took too long',
    scanProgress: 0,
  };
}

// Quarantine suspicious file
async function quarantineFile(
  fileData: ArrayBuffer,
  fileName: string,
  mimeType: string,
  userId: string,
  scanResult: ScanResult
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Generate unique quarantine path
  const quarantinePath = `quarantine/${userId}/${Date.now()}-${crypto.randomUUID()}.quarantine`;
  
  // Upload to quarantine bucket (using content bucket with quarantine prefix)
  const { error: uploadError } = await supabase.storage
    .from('content')
    .upload(quarantinePath, fileData, {
      contentType: 'application/octet-stream', // Don't use original mime type for safety
      upsert: false,
    });

  if (uploadError) {
    console.error('Quarantine upload error:', uploadError);
    throw new Error('Failed to quarantine file');
  }

  // Record in quarantine table
  const { data: quarantineRecord, error: dbError } = await supabase
    .from('quarantine_files')
    .insert({
      original_filename: fileName,
      file_size: fileData.byteLength,
      mime_type: mimeType,
      storage_path: quarantinePath,
      scan_id: scanResult.scanId,
      threat_type: scanResult.threatType || 'unknown',
      threat_details: scanResult.threatFound,
      scan_result: scanResult,
      uploader_id: userId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('Quarantine record error:', dbError);
    // Try to cleanup uploaded file
    await supabase.storage.from('content').remove([quarantinePath]);
    throw new Error('Failed to record quarantine');
  }

  console.log(`File quarantined: ${quarantineRecord.id}`);
  return quarantineRecord.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Require authentication
    const authResult = await validateJwtAndGetUserId(req.headers.get('Authorization'));
    
    if (authResult.error) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    console.log(`[scan-file-virus] User ${userId} requesting virus scan`);

    if (!METADEFENDER_API_KEY) {
      console.error('METADEFENDER_API_KEY not configured');
      // SECURITY: Fail closed when service not configured
      return new Response(
        JSON.stringify({ 
          isClean: false, 
          skipped: true,
          error: 'Virus scan service not configured',
          message: 'File upload blocked: virus scan unavailable' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scanning file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Reject files that are too large
    if (file.size > MAX_SCAN_SIZE) {
      console.log(`File too large for scan: ${file.size} bytes`);
      // SECURITY: Fail closed for large files
      return new Response(
        JSON.stringify({ 
          isClean: false, 
          skipped: true,
          error: 'File too large for virus scan',
          message: 'File upload blocked: exceeds scan size limit (140MB)'
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileData = await file.arrayBuffer();
    
    const dataId = await uploadFileForScan(fileData, file.name);
    const scanResult = await waitForScanComplete(dataId);
    
    console.log(`Scan complete for ${file.name}:`, scanResult);

    // Handle different scan outcomes
    if (scanResult.isClean) {
      // File is clean - allow upload
      return new Response(
        JSON.stringify(scanResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // File is not clean - determine if infected or suspicious
    const isDefinitelyInfected = scanResult.threatFound && !scanResult.threatType?.includes('suspicious');
    
    if (isDefinitelyInfected) {
      // Definitely infected - block completely
      console.log(`Infected file blocked: ${file.name}, threat: ${scanResult.threatFound}`);
      return new Response(
        JSON.stringify({
          ...scanResult,
          message: `Menace détectée: ${scanResult.threatFound}. Fichier bloqué.`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Suspicious/unknown - quarantine for review
    try {
      const quarantineId = await quarantineFile(
        fileData,
        file.name,
        file.type,
        userId,
        scanResult
      );

      console.log(`Suspicious file quarantined: ${file.name}, id: ${quarantineId}`);
      
      return new Response(
        JSON.stringify({
          ...scanResult,
          quarantined: true,
          quarantineId,
          message: 'Fichier suspect mis en quarantaine pour analyse. Un administrateur examinera le fichier.'
        }),
        { 
          status: 202, // Accepted for processing
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (quarantineError) {
      console.error('Quarantine failed:', quarantineError);
      // If quarantine fails, block the file
      return new Response(
        JSON.stringify({
          ...scanResult,
          error: 'Failed to quarantine suspicious file',
          message: 'Fichier bloqué: impossible de mettre en quarantaine'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Virus scan error:', error);
    const corsHeaders = getCorsHeaders(req);
    
    // SECURITY: Fail closed on any error
    return new Response(
      JSON.stringify({ 
        isClean: false, 
        error: error.message,
        message: 'File upload blocked: virus scan failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
