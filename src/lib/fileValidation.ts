/**
 * Système de validation sécurisé des fichiers uploadés
 * Vérifie le type MIME, l'extension, les magic bytes et la taille
 */

// Magic bytes signatures pour chaque type de fichier
const MAGIC_BYTES: Record<string, { bytes: number[], offset?: number }[]> = {
  // Images JPEG
  'image/jpeg': [
    { bytes: [0xFF, 0xD8, 0xFF] }
  ],
  // Images PNG
  'image/png': [
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
  ],
  // Images WebP
  'image/webp': [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }  // WEBP
  ],
  // Images GIF
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }  // GIF89a
  ],
  // Vidéos MP4 (plusieurs signatures possibles)
  'video/mp4': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp
  ],
  // Vidéos WebM
  'video/webm': [
    { bytes: [0x1A, 0x45, 0xDF, 0xA3] } // EBML
  ],
  // Vidéos QuickTime (MOV)
  'video/quicktime': [
    { bytes: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], offset: 4 }, // ftypqt
    { bytes: [0x6D, 0x6F, 0x6F, 0x76], offset: 4 } // moov
  ]
};

// Extensions autorisées par type MIME
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov']
};

// Types MIME autorisés
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

// Tailles maximales par type (en bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  'image': 20 * 1024 * 1024,  // 20MB pour images
  'video': 100 * 1024 * 1024  // 100MB pour vidéos
};

// Caractères dangereux dans les noms de fichiers
const DANGEROUS_FILENAME_PATTERNS = [
  /\.\./,           // Path traversal
  /[<>:"|?*]/,      // Caractères interdits Windows
  /^\./,            // Fichiers cachés Unix
  /\0/,             // Null byte
  /%00/,            // Encoded null byte
  /\x00/,           // Null character
  /\.php/i,         // Scripts PHP
  /\.js$/i,         // Scripts JS
  /\.exe$/i,        // Executables
  /\.bat$/i,        // Batch files
  /\.cmd$/i,        // Command files
  /\.sh$/i,         // Shell scripts
  /\.ps1$/i,        // PowerShell
  /\.vbs$/i,        // VBScript
  /\.html?$/i,      // HTML files
  /\.svg$/i,        // SVG (peut contenir du JS)
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedMimeType?: string;
}

/**
 * Lit les premiers bytes d'un fichier pour vérifier les magic bytes
 */
async function readFileBytes(file: File, length: number = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer));
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

/**
 * Vérifie si les bytes correspondent à une signature
 */
function matchesSignature(bytes: Uint8Array, signature: { bytes: number[], offset?: number }): boolean {
  const offset = signature.offset || 0;
  if (bytes.length < offset + signature.bytes.length) return false;
  
  return signature.bytes.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Détecte le vrai type MIME basé sur les magic bytes
 */
async function detectRealMimeType(file: File): Promise<string | null> {
  try {
    const bytes = await readFileBytes(file, 20);
    
    for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const signature of signatures) {
        if (matchesSignature(bytes, signature)) {
          return mimeType;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extrait l'extension d'un nom de fichier
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Sanitize le nom de fichier pour éviter les attaques
 */
function sanitizeFilename(filename: string): string {
  // Supprimer les caractères dangereux
  let sanitized = filename
    .replace(/[<>:"|?*\0]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/%00/g, '_')
    .trim();
  
  // Limiter la longueur
  if (sanitized.length > 200) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, -(ext.length + 1));
    sanitized = nameWithoutExt.slice(0, 190) + '.' + ext;
  }
  
  // S'assurer qu'il y a un nom
  if (!sanitized || sanitized === '.') {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}

/**
 * Vérifie si le nom de fichier contient des patterns dangereux
 */
function hasUnsafeFilename(filename: string): boolean {
  return DANGEROUS_FILENAME_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Valide complètement un fichier uploadé
 */
export async function validateFile(file: File, skipExtensionCheck = false): Promise<FileValidationResult> {
  // 1. Vérifier que le fichier existe et a une taille > 0
  if (!file || file.size === 0) {
    return { isValid: false, error: 'Fichier vide ou invalide' };
  }

  // 2. Vérifier le nom de fichier pour les attaques
  if (hasUnsafeFilename(file.name)) {
    return { isValid: false, error: 'Nom de fichier non autorisé pour des raisons de sécurité' };
  }

  // 3. Vérifier le type MIME déclaré
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Type de fichier non autorisé: ${file.type || 'inconnu'}. Utilisez JPG, PNG, WebP, GIF ou MP4, WebM, MOV.` 
    };
  }

  // 4. Vérifier l'extension (skip for internally processed files)
  if (!skipExtensionCheck) {
    const extension = getFileExtension(file.name);
    const allowedExtensions = ALLOWED_EXTENSIONS[file.type];
    
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      return { 
        isValid: false, 
        error: `Extension de fichier (.${extension}) incompatible avec le type ${file.type}` 
      };
    }
  }

  // 5. Vérifier les magic bytes (le vrai type du fichier)
  const detectedMimeType = await detectRealMimeType(file);
  
  if (!detectedMimeType) {
    return { 
      isValid: false, 
      error: 'Impossible de vérifier le contenu du fichier. Le fichier pourrait être corrompu ou malveillant.' 
    };
  }

  // 6. Vérifier que le type détecté correspond au type déclaré
  // Permettre certaines correspondances (ex: video/quicktime peut être détecté comme video/mp4)
  const typeMatches = 
    detectedMimeType === file.type ||
    (detectedMimeType === 'video/mp4' && file.type === 'video/quicktime') ||
    (detectedMimeType === 'video/quicktime' && file.type === 'video/mp4');

  if (!typeMatches) {
    return { 
      isValid: false, 
      error: `Le contenu du fichier ne correspond pas à son type déclaré. Type déclaré: ${file.type}, contenu détecté: ${detectedMimeType}. Ceci peut indiquer un fichier malveillant.` 
    };
  }

  // 7. Vérifier la taille selon le type
  const fileCategory = file.type.startsWith('image/') ? 'image' : 'video';
  const maxSize = MAX_FILE_SIZES[fileCategory];
  
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { 
      isValid: false, 
      error: `Fichier trop volumineux. Taille maximum pour les ${fileCategory === 'image' ? 'images' : 'vidéos'}: ${maxSizeMB}MB` 
    };
  }

  // 8. Sanitize le nom de fichier - fix extension if needed
  let sanitizedFilename = sanitizeFilename(file.name);
  
  // If extension doesn't match the actual type, fix it
  const currentExt = getFileExtension(sanitizedFilename);
  const correctExtensions = ALLOWED_EXTENSIONS[file.type];
  if (correctExtensions && !correctExtensions.includes(currentExt)) {
    const baseName = sanitizedFilename.replace(/\.[^/.]+$/, '');
    sanitizedFilename = `${baseName}.${correctExtensions[0]}`;
  }

  return { 
    isValid: true, 
    sanitizedFilename,
    detectedMimeType
  };
}

/**
 * Valide un fichier pour les messages privés (plus restrictif)
 */
export async function validatePrivateMessageFile(file: File): Promise<FileValidationResult> {
  // Validation standard
  const result = await validateFile(file);
  
  if (!result.isValid) {
    return result;
  }

  // Taille plus restrictive pour les messages privés (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: 'Les fichiers en message privé sont limités à 10MB' 
    };
  }

  return result;
}

/**
 * Utilitaire pour obtenir le type de contenu à partir d'un fichier validé
 */
export function getContentType(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image';
}
