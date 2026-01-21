import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VirusScanResult {
  isClean: boolean;
  scanId?: string;
  threatFound?: string;
  threatType?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
  quarantined?: boolean;
  quarantineId?: string;
}

export type ScanStatus = 'idle' | 'scanning' | 'clean' | 'infected' | 'quarantined' | 'error';

export const useVirusScan = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VirusScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  const scanFile = async (file: File): Promise<VirusScanResult> => {
    setScanning(true);
    setScanResult(null);
    setScanStatus('scanning');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('scan-file-virus', {
        body: formData,
      });

      if (error) {
        console.error('Virus scan error:', error);
        
        // Check if it's a quarantine response (202 status)
        if (error.message?.includes('quarantine') || data?.quarantined) {
          const result: VirusScanResult = {
            isClean: false,
            quarantined: true,
            quarantineId: data?.quarantineId,
            message: data?.message || 'Fichier mis en quarantaine pour analyse'
          };
          setScanResult(result);
          setScanStatus('quarantined');
          return result;
        }
        
        // Real error - block upload
        const result: VirusScanResult = {
          isClean: false,
          error: error.message,
          message: 'Scan antivirus échoué, fichier bloqué par sécurité'
        };
        setScanResult(result);
        setScanStatus('error');
        return result;
      }

      // Handle quarantined response
      if (data?.quarantined) {
        const result: VirusScanResult = {
          ...data,
          isClean: false,
        };
        setScanResult(result);
        setScanStatus('quarantined');
        return result;
      }

      // Handle infected response
      if (data?.threatFound && !data?.isClean) {
        const result: VirusScanResult = {
          ...data,
          isClean: false,
        };
        setScanResult(result);
        setScanStatus('infected');
        return result;
      }

      // Clean file
      if (data?.isClean) {
        setScanResult(data);
        setScanStatus('clean');
        return data;
      }

      // Unknown state - treat as blocked
      const result: VirusScanResult = {
        isClean: false,
        error: 'Unknown scan result',
        message: 'Résultat du scan inconnu, fichier bloqué'
      };
      setScanResult(result);
      setScanStatus('error');
      return result;

    } catch (err) {
      console.error('Virus scan exception:', err);
      const result: VirusScanResult = {
        isClean: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        message: 'Erreur lors du scan antivirus, fichier bloqué'
      };
      setScanResult(result);
      setScanStatus('error');
      return result;
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setScanResult(null);
    setScanStatus('idle');
  };

  return {
    scanFile,
    scanning,
    scanResult,
    scanStatus,
    reset,
  };
};
