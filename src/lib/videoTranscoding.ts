/**
 * Video Format Validation - Version simplifiée
 * Accepte les formats natifs, refuse les formats problématiques
 * NOTE: La conversion client-side via MediaRecorder cause des désynchronisations audio/vidéo
 * donc on ne la propose plus.
 */

export interface TranscodingProgress {
  stage: 'loading' | 'transcoding' | 'complete' | 'error' | 'skipped';
  progress: number;
  message: string;
}

export interface TranscodingResult {
  success: boolean;
  file: File;
  originalFormat: string;
  wasConverted: boolean;
  error?: string;
}

// Formats supportés nativement par la plupart des navigateurs
const NATIVE_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // MOV - supporté par Safari + Chrome moderne
];

// Extensions natives acceptées
const NATIVE_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];

// Formats qui ne sont PAS supportés (refusés à l'upload)
const UNSUPPORTED_EXTENSIONS = ['avi', 'mkv', 'flv', 'wmv', 'asf', '3gp'];

/**
 * Vérifier si le format nécessite une conversion
 * NOTE: On refuse les formats problématiques au lieu de les convertir
 */
export function needsTranscoding(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Formats natifs: pas de conversion
  if (NATIVE_FORMATS.includes(mimeType) || NATIVE_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // Extensions non supportées: marquées pour refus
  if (UNSUPPORTED_EXTENSIONS.includes(extension)) {
    return true;
  }
  
  // Par défaut, accepter sans conversion
  return false;
}

/**
 * Vérifier si le format est supporté nativement
 */
export function isNativeFormat(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  return NATIVE_FORMATS.includes(mimeType) || NATIVE_EXTENSIONS.includes(extension);
}

/**
 * Obtenir la liste des formats supportés pour l'affichage
 */
export function getSupportedFormats(): string[] {
  return ['MP4', 'WebM', 'MOV', 'OGG'];
}

/**
 * "Transcoder" une vidéo - en réalité, on accepte ou refuse
 * La vraie conversion est désactivée car elle cause des désync audio.
 */
export async function transcodeVideo(
  file: File,
  onProgress?: (progress: TranscodingProgress) => void
): Promise<TranscodingResult> {
  const originalFormat = file.type || 'unknown';
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Si format natif, pas besoin de conversion
  if (!needsTranscoding(file)) {
    onProgress?.({ 
      stage: 'skipped', 
      progress: 100, 
      message: 'Format compatible' 
    });
    return {
      success: true,
      file,
      originalFormat,
      wasConverted: false
    };
  }
  
  // Formats non supportés: refuser proprement
  onProgress?.({ 
    stage: 'error', 
    progress: 0, 
    message: `Format ${extension.toUpperCase()} non supporté` 
  });
  
  return {
    success: false,
    file,
    originalFormat,
    wasConverted: false,
    error: `Le format ${extension.toUpperCase()} n'est pas supporté. Veuillez convertir votre vidéo en MP4 ou WebM avec un logiciel gratuit comme HandBrake avant l'upload.`
  };
}
