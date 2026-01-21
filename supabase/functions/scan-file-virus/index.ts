import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METADEFENDER_API_KEY = Deno.env.get('METADEFENDER_API_KEY');
const METADEFENDER_API_URL = 'https://api.metadefender.com/v4';

// Max file size for scanning: 140MB (MetaDefender limit)
const MAX_SCAN_SIZE = 140 * 1024 * 1024;

interface ScanResult {
  isClean: boolean;
  scanId?: string;
  threatFound?: string;
  scanProgress?: number;
  error?: string;
  skipped?: boolean;
}

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

  // scan_all_result_i: 0 = Clean, 1 = Infected, 2 = Suspicious
  const scanAllResult = result.scan_results?.scan_all_result_i;
  const isClean = scanAllResult === 0;
  
  let threatFound: string | undefined;
  if (!isClean && result.scan_results?.scan_details) {
    const threats = Object.entries(result.scan_results.scan_details)
      .filter(([_, detail]: [string, any]) => detail.threat_found)
      .map(([engine, detail]: [string, any]) => `${engine}: ${detail.threat_found}`);
    
    if (threats.length > 0) {
      threatFound = threats.join(', ');
    }
  }

  return {
    isClean,
    scanId: dataId,
    threatFound,
    scanProgress: 100,
  };
}

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
    error: 'Scan timeout: file analysis took too long',
    scanProgress: 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // SECURITY: If scan failed or file is infected, return error status
    if (!scanResult.isClean) {
      return new Response(
        JSON.stringify({
          ...scanResult,
          message: scanResult.threatFound 
            ? `Threat detected: ${scanResult.threatFound}`
            : 'File scan failed or suspicious content detected'
        }),
        { 
          status: scanResult.threatFound ? 400 : 500, // 400 for threats, 500 for errors
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify(scanResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Virus scan error:', error);
    
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
