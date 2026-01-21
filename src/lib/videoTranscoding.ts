/**
 * Conversion vidéo côté client
 * Convertit les formats non compatibles (MOV, etc.) en MP4
 */

export interface TranscodingProgress {
  stage: 'loading' | 'transcoding' | 'complete' | 'error';
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

// Formats qui nécessitent une conversion
const FORMATS_NEEDING_CONVERSION = [
  'video/quicktime',  // .mov
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
];

// Vérifier si le format nécessite une conversion
export function needsTranscoding(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  return FORMATS_NEEDING_CONVERSION.includes(mimeType) || 
         extension === 'mov' || 
         extension === 'avi' || 
         extension === 'mkv';
}

// Vérifier si le navigateur supporte MediaRecorder pour MP4
export function supportsMediaRecorder(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  
  // Vérifier le support des codecs
  const types = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
  ];
  
  return types.some(type => MediaRecorder.isTypeSupported(type));
}

/**
 * Convertit une vidéo en MP4/WebM compatible
 * Utilise Canvas + MediaRecorder pour le transcodage
 */
export async function transcodeVideo(
  file: File,
  onProgress?: (progress: TranscodingProgress) => void
): Promise<TranscodingResult> {
  const originalFormat = file.type || 'unknown';
  
  // Si pas besoin de conversion
  if (!needsTranscoding(file)) {
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
      error: 'Votre navigateur ne supporte pas la conversion vidéo. Veuillez utiliser Chrome ou Firefox.'
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
    
    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      
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
      const stream = canvas.captureStream(30); // 30 FPS
      
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
        videoBitsPerSecond: 5000000, // 5 Mbps
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
        
        // Cleanup
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
      mediaRecorder.start(100); // Collecter toutes les 100ms
      
      // Lire la vidéo et dessiner sur le canvas
      video.currentTime = 0;
      
      const drawFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Mettre à jour la progression
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
      resolve({
        success: false,
        file,
        originalFormat,
        wasConverted: false,
        error: 'Impossible de charger la vidéo source'
      });
    };
    
    // Charger la vidéo
    video.src = URL.createObjectURL(file);
    video.load();
  });
}
