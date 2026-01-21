import { ReactNode, useMemo } from 'react';
import { useContentProtection } from '@/hooks/useContentProtection';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedMediaProps {
  children: ReactNode;
  className?: string;
  watermarkText?: string;
  enableKeyboardProtection?: boolean;
  /** Activer le watermark forensique avec ID utilisateur pour tracer les fuites */
  enableForensicWatermark?: boolean;
  /** Opacité du watermark forensique (0-1), défaut: 0.03 */
  forensicOpacity?: number;
}

/**
 * Génère un hash court à partir d'une chaîne (pour anonymiser partiellement l'ID)
 */
const generateShortHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
};

/**
 * Génère un pattern de watermark forensique unique basé sur l'utilisateur
 */
const generateForensicPattern = (userId: string, timestamp: number): string => {
  const hash = generateShortHash(userId + timestamp.toString());
  return `${hash}-${new Date(timestamp).toISOString().slice(0, 10)}`;
};

/**
 * Composant pour protéger les médias contre le téléchargement et la capture
 * Inclut:
 * - Overlay invisible bloquant les interactions directes
 * - Filigrane textuel optionnel (nom du créateur)
 * - Watermark forensique avec ID utilisateur pour tracer les fuites
 * - Protection contre le clic droit, drag-drop, sélection
 * - Styles CSS anti-capture
 * - Flou automatique lors de perte de focus (anti-capture)
 */
export const ProtectedMedia = ({ 
  children, 
  className = '',
  watermarkText,
  enableKeyboardProtection = false,
  enableForensicWatermark = false,
  forensicOpacity = 0.03
}: ProtectedMediaProps) => {
  const { user } = useAuth();
  
  // Activer la protection clavier et récupérer l'état de flou
  const { isBlurred } = useContentProtection(enableKeyboardProtection);

  // Générer le watermark forensique unique pour cet utilisateur
  const forensicData = useMemo(() => {
    if (!enableForensicWatermark || !user) return null;
    
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Arrondi à l'heure
    const pattern = generateForensicPattern(user.id, timestamp);
    const shortId = user.id.slice(0, 8);
    
    return {
      pattern,
      shortId,
      // Créer des positions pseudo-aléatoires basées sur l'ID utilisateur
      positions: [
        { top: '15%', left: '10%', rotation: -15 },
        { top: '45%', left: '75%', rotation: 25 },
        { top: '75%', left: '20%', rotation: -5 },
        { top: '25%', left: '60%', rotation: 15 },
        { top: '65%', left: '45%', rotation: -20 },
        { top: '85%', left: '80%', rotation: 10 },
      ]
    };
  }, [enableForensicWatermark, user]);

  return (
    <div 
      className={`relative protected-content ${className}`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Contenu média avec styles de protection */}
      <div 
        className="protected-media-content relative z-5 transition-all duration-300"
        style={{
          filter: isBlurred ? 'blur(30px) brightness(0.5)' : 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {/* Overlay de protection quand flou activé */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center text-white p-6">
            <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-primary" />
            <p className="text-lg font-semibold">Contenu protégé</p>
            <p className="text-sm text-white/70 mt-1">Revenez sur cette page pour voir le contenu</p>
          </div>
        </div>
      )}
      
      {/* Overlay invisible pour bloquer clic droit et drag seulement */}
      <div 
        className="absolute inset-0 z-[1]"
        style={{ 
          background: 'transparent',
          pointerEvents: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      
      {/* Motif de protection invisible */}
      <div 
        className="absolute inset-0 pointer-events-none z-15"
        style={{
          background: `
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.003) 10px,
              rgba(255,255,255,0.003) 20px
            )
          `,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Watermark forensique avec ID utilisateur - Très subtil mais traçable */}
      {forensicData && !isBlurred && (
        <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
          {/* Pattern de watermarks distribués */}
          {forensicData.positions.map((pos, index) => (
            <div
              key={index}
              className="absolute text-white font-mono select-none"
              style={{
                top: pos.top,
                left: pos.left,
                transform: `rotate(${pos.rotation}deg)`,
                opacity: forensicOpacity,
                fontSize: '10px',
                letterSpacing: '0.5px',
                textShadow: '0 0 1px rgba(0,0,0,0.5)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {forensicData.pattern}
            </div>
          ))}
          
          {/* Watermark central plus visible */}
          <div
            className="absolute font-mono select-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              opacity: forensicOpacity * 1.5,
              fontSize: '14px',
              color: 'white',
              letterSpacing: '2px',
              textShadow: '0 0 2px rgba(0,0,0,0.3)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ID:{forensicData.shortId}
          </div>

          {/* Micro-watermarks dans les coins (quasi invisibles) */}
          <div
            className="absolute font-mono select-none"
            style={{
              bottom: '2px',
              right: '4px',
              opacity: forensicOpacity * 0.7,
              fontSize: '6px',
              color: 'white',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {forensicData.pattern}
          </div>
          <div
            className="absolute font-mono select-none"
            style={{
              top: '2px',
              left: '4px',
              opacity: forensicOpacity * 0.7,
              fontSize: '6px',
              color: 'white',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {forensicData.shortId}
          </div>
        </div>
      )}
      
      {/* Filigrane textuel du créateur si fourni */}
      {watermarkText && !isBlurred && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden"
        >
          {/* Motif de filigrane répété */}
          <div 
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(
                -30deg,
                transparent,
                transparent 150px,
                rgba(255,255,255,0.02) 150px,
                rgba(255,255,255,0.02) 300px
              )`,
            }}
          />
          
          {/* Filigrane principal */}
          <div 
            className="text-white/10 text-4xl md:text-6xl font-bold select-none"
            style={{
              transform: 'rotate(-30deg)',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              letterSpacing: '0.1em',
            }}
          >
            {watermarkText}
          </div>
          
          {/* Filigranes secondaires dans les coins */}
          <div 
            className="absolute top-4 left-4 text-white/5 text-sm font-medium select-none"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {watermarkText}
          </div>
          <div 
            className="absolute bottom-4 right-4 text-white/5 text-sm font-medium select-none"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {watermarkText}
          </div>
        </div>
      )}
    </div>
  );
};