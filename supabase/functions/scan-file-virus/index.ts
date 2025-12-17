import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METADEFENDER_API_KEY = Deno.env.get('METADEFENDER_API_KEY');
const METADEFENDER_API_URL = 'https://api.metadefender.com/v4';

interface ScanResult {
  isClean: boolean;
  scanId?: string;
  threatFound?: string;
  scanProgress?: number;
  error?: string;
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

  // Check scan progress
  const scanProgress = result.scan_results?.progress_percentage || 0;
  
  if (scanProgress < 100) {
    return {
      isClean: true,
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
    
    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Scan timeout: file analysis took too long');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!METADEFENDER_API_KEY) {
      console.error('METADEFENDER_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          isClean: true, 
          skipped: true,
          message: 'Virus scan skipped: API key not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Skip scan for very large files (MetaDefender free tier limit is 140MB)
    const MAX_SCAN_SIZE = 140 * 1024 * 1024; // 140MB
    if (file.size > MAX_SCAN_SIZE) {
      console.log(`File too large for scan: ${file.size} bytes`);
      return new Response(
        JSON.stringify({ 
          isClean: true, 
          skipped: true,
          message: 'File too large for virus scan' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to ArrayBuffer
    const fileData = await file.arrayBuffer();
    
    // Upload file for scanning
    const dataId = await uploadFileForScan(fileData, file.name);
    
    // Wait for scan to complete
    const scanResult = await waitForScanComplete(dataId);
    
    console.log(`Scan complete for ${file.name}:`, scanResult);

    return new Response(
      JSON.stringify(scanResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Virus scan error:', error);
    
    // En cas d'erreur, on laisse passer le fichier mais on log l'erreur
    // Pour ne pas bloquer l'upload si le service est indisponible
    return new Response(
      JSON.stringify({ 
        isClean: true, 
        skipped: true,
        error: error.message,
        message: 'Virus scan failed, file allowed with warning'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
