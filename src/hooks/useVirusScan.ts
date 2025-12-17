import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VirusScanResult {
  isClean: boolean;
  scanId?: string;
  threatFound?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
}

export const useVirusScan = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VirusScanResult | null>(null);

  const scanFile = async (file: File): Promise<VirusScanResult> => {
    setScanning(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('scan-file-virus', {
        body: formData,
      });

      if (error) {
        console.error('Virus scan error:', error);
        // En cas d'erreur, on considère le fichier comme propre pour ne pas bloquer
        const result: VirusScanResult = {
          isClean: true,
          skipped: true,
          error: error.message,
          message: 'Scan indisponible, fichier accepté avec avertissement'
        };
        setScanResult(result);
        return result;
      }

      setScanResult(data);
      return data;
    } catch (err) {
      console.error('Virus scan exception:', err);
      const result: VirusScanResult = {
        isClean: true,
        skipped: true,
        error: err instanceof Error ? err.message : 'Unknown error',
        message: 'Scan indisponible, fichier accepté avec avertissement'
      };
      setScanResult(result);
      return result;
    } finally {
      setScanning(false);
    }
  };

  return {
    scanFile,
    scanning,
    scanResult,
  };
};
