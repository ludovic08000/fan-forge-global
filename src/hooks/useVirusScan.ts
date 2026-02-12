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
        
        // Check if it's a quarantine response (202 status with data)
        if (data?.quarantined) {
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

        // Check if data contains a positive infection (400 status with threat info)
        if (data?.threatFound) {
          const result: VirusScanResult = {
            isClean: false,
            threatFound: data.threatFound,
            threatType: data.threatType,
            message: data.message || 'Menace détectée'
          };
          setScanResult(result);
          setScanStatus('infected');
          return result;
        }
        
        // Scan service error (network, timeout, misc) - allow upload to proceed
        console.warn('Virus scan unavailable, allowing upload:', error.message);
        const result: VirusScanResult = {
          isClean: true,
          skipped: true,
          message: 'Scan antivirus indisponible, fichier accepté'
        };
        setScanResult(result);
        setScanStatus('clean');
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
      console.warn('Virus scan exception (non-blocking):', err);
      // Scan service unavailable - allow upload to proceed
      const result: VirusScanResult = {
        isClean: true,
        skipped: true,
        error: err instanceof Error ? err.message : 'Unknown error',
        message: 'Scan antivirus indisponible, fichier accepté'
      };
      setScanResult(result);
      setScanStatus('clean');
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
