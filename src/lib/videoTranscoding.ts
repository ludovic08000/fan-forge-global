/**
 * Conversion vidéo côté client - Version optimisée
 * Accepte plus de formats nativement, conversion uniquement si nécessaire
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
];

// Formats qui nécessitent une conversion (vraiment incompatibles)
const FORMATS_NEEDING_CONVERSION = [
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
  'video/x-flv',      // .flv
  'video/x-ms-wmv',   // .wmv
];

/**
 * Vérifier si le format nécessite une conversion
 * MOV est maintenant accepté nativement (Safari + Chrome moderne le supportent)
 */
export function needsTranscoding(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // MOV est maintenant accepté nativement
  if (mimeType === 'video/quicktime' || extension === 'mov') {
    return false; // Pas de conversion pour MOV
  }
  
  // Vérifier si c'est un format problématique
  if (FORMATS_NEEDING_CONVERSION.includes(mimeType)) {
    return true;
  }
  
  // Extensions problématiques
  if (['avi', 'mkv', 'flv', 'wmv'].includes(extension)) {
    return true;
  }
  
  return false;
}

/**
 * Vérifier si le format est supporté nativement
 */
export function isNativeFormat(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // MP4, WebM, OGG sont toujours supportés
  if (NATIVE_FORMATS.includes(mimeType)) {
    return true;
  }
  
  // MOV est maintenant considéré comme natif
  if (mimeType === 'video/quicktime' || extension === 'mov') {
    return true;
  }
  
  return false;
}

/**
 * Vérifier si le navigateur supporte MediaRecorder pour la conversion
 */
export function supportsMediaRecorder(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  
  const types = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
  ];
  
  return types.some(type => MediaRecorder.isTypeSupported(type));
}

/**
 * Transcoder une vidéo uniquement si vraiment nécessaire
 * Optimisé : skip si format natif, conversion rapide sinon
 */
export async function transcodeVideo(
  file: File,
  onProgress?: (progress: TranscodingProgress) => void
): Promise<TranscodingResult> {
  const originalFormat = file.type || 'unknown';
  
  // Si format natif, pas besoin de conversion
  if (!needsTranscoding(file)) {
    onProgress?.({ 
      stage: 'skipped', 
      progress: 100, 
      message: 'Format compatible, pas de conversion nécessaire' 
    });
    return {
      success: true,
      file,
      originalFormat,
      wasConverted: false
    };
  }
  
  // Vérifier le support MediaRecorder
  if (!supportsMediaRecorder()) {
    return {
      success: false,
      file,
      originalFormat,
      wasConverted: false,
      error: 'Votre navigateur ne supporte pas la conversion vidéo. Veuillez convertir en MP4 avant upload.'
    };
  }
  
  onProgress?.({ stage: 'loading', progress: 0, message: 'Chargement de la vidéo...' });
  
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve({
        success: false,
        file,
        originalFormat,
        wasConverted: false,
        error: 'Impossible de créer le contexte de rendu'
      });
      return;
    }
    
    // Timeout pour éviter de bloquer indéfiniment
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        file,
        originalFormat,
        wasConverted: false,
        error: 'Timeout: la vidéo prend trop de temps à charger'
      });
    }, 30000);
    
    video.onloadedmetadata = async () => {
      clearTimeout(timeout);
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      
      // Limite: pas de conversion pour vidéos > 5 minutes
      if (duration > 300) {
        resolve({
          success: false,
          file,
          originalFormat,
          wasConverted: false,
          error: 'Vidéo trop longue pour la conversion. Veuillez convertir en MP4 avec un logiciel externe.'
        });
        return;
      }
      
      onProgress?.({ 
        stage: 'transcoding', 
        progress: 5, 
        message: `Conversion en cours (${Math.round(duration)}s de vidéo)...` 
      });
      
      // Choisir le meilleur format supporté
      let mimeType = 'video/webm;codecs=vp9';
      let fileExtension = 'webm';
      
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
        fileExtension = 'webm';
      }
      
      // Capturer le stream du canvas
      const stream = canvas.captureStream(30);
      
      // Ajouter l'audio si présent
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        console.log('Pas de piste audio ou erreur audio:', e);
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType.split(';')[0],
        videoBitsPerSecond: 5000000,
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const newFileName = file.name.replace(/\.[^.]+$/, `.${fileExtension}`);
        const newFile = new File([blob], newFileName, { type: mimeType.split(';')[0] });
        
        onProgress?.({ stage: 'complete', progress: 100, message: 'Conversion terminée!' });
        
        URL.revokeObjectURL(video.src);
        
        resolve({
          success: true,
          file: newFile,
          originalFormat,
          wasConverted: true
        });
      };
      
      mediaRecorder.onerror = () => {
        resolve({
          success: false,
          file,
          originalFormat,
          wasConverted: false,
          error: 'Erreur pendant la conversion'
        });
      };
      
      // Démarrer l'enregistrement
      mediaRecorder.start(100);
      
      // Lire la vidéo et dessiner sur le canvas
      video.currentTime = 0;
      
      const drawFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const progress = Math.min(95, 5 + (video.currentTime / duration) * 90);
        onProgress?.({ 
          stage: 'transcoding', 
          progress, 
          message: `Conversion: ${Math.round(video.currentTime)}s / ${Math.round(duration)}s` 
        });
        
        requestAnimationFrame(drawFrame);
      };
      
      video.onended = () => {
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      };
      
      video.play().then(() => {
        drawFrame();
      }).catch((err) => {
        resolve({
          success: false,
          file,
          originalFormat,
          wasConverted: false,
          error: `Impossible de lire la vidéo: ${err.message}`
        });
      });
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      resolve({
        success: false,
        file,
        originalFormat,
        wasConverted: false,
        error: 'Impossible de charger la vidéo source'
      });
    };
    
    video.src = URL.createObjectURL(file);
    video.load();
  });
}
