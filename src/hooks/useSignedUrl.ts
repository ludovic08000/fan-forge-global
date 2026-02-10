import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSecureR2Url, getSecureR2Url } from './useSecureR2Url';

/**
 * Hook unifié - redirige vers R2 signed URLs
 * Conservé pour compatibilité, mais tout passe par R2 maintenant
 */
export const useSignedUrl = (
  originalUrl: string | undefined | null,
  options?: {
    bucket?: string;
    contentId?: string;
    enabled?: boolean;
  }
) => {
  const { secureUrl, loading, error, refresh, isR2 } = useSecureR2Url(originalUrl, {
    contentId: options?.contentId,
    enabled: options?.enabled,
  });

  return {
    signedUrl: secureUrl,
    loading,
    error,
    refresh,
    isUsingSignedUrl: secureUrl !== originalUrl,
  };
};

/**
 * Fonction utilitaire - redirige vers R2
 */
export const getSignedUrl = async (
  filePath: string,
  _bucket: string = 'content',
  contentId?: string
): Promise<string | null> => {
  return getSecureR2Url(filePath, contentId);
};
