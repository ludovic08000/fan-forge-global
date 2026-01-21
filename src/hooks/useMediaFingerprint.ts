import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FingerprintResult {
  id: string;
  sha256: string;
  phash: string | null;
  videoFingerprint: string | null;
  watermarkId: string;
}

export interface MediaFingerprintInput {
  fileUrl: string;
  contentId?: string;
  messageId?: string;
  creatorId?: string;
  fileType: 'image' | 'video';
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  watermarkId?: string;
  watermarkPattern?: string;
}

export const useMediaFingerprint = () => {
  const [computing, setComputing] = useState(false);

  const computeFingerprint = async (input: MediaFingerprintInput): Promise<FingerprintResult | null> => {
    try {
      setComputing(true);

      const { data, error } = await supabase.functions.invoke('compute-media-fingerprint', {
        body: input
      });

      if (error) {
        console.error('Fingerprint error:', error);
        return null;
      }

      if (data.warning === 'duplicate_detected') {
        console.warn('Duplicate detected:', data.message);
        // We still return the fingerprint data even for duplicates
        return null;
      }

      return data.fingerprint;
    } catch (error) {
      console.error('Fingerprint computation error:', error);
      return null;
    } finally {
      setComputing(false);
    }
  };

  /**
   * Compute fingerprint from a local file (before upload)
   */
  const computeLocalSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  /**
   * Generate a watermark ID for tracking
   */
  const generateWatermarkId = (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `WM-${timestamp}-${random}`.toUpperCase();
  };

  return {
    computeFingerprint,
    computeLocalSHA256,
    generateWatermarkId,
    computing
  };
};
