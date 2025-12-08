import { ReactNode, useEffect } from 'react';
import { useContentProtection } from '@/hooks/useContentProtection';

interface ProtectedMediaProps {
  children: ReactNode;
  className?: string;
  watermarkText?: string;
  enableKeyboardProtection?: boolean;
}

/**
 * Composant pour protéger les médias contre le téléchargement et la capture
 * Inclut:
 * - Overlay invisible bloquant les interactions directes
 * - Filigrane textuel optionnel
 * - Protection contre le clic droit, drag-drop, sélection
 * - Styles CSS anti-capture
 */
export const ProtectedMedia = ({ 
  children, 
  className = '',
  watermarkText,
  enableKeyboardProtection = false
}: ProtectedMediaProps) => {
  // Activer la protection clavier si demandé
  useContentProtection(enableKeyboardProtection);

  return (
    <div 
      className={`relative protected-content ${className}`}
      style={{
        // Empêcher la sélection
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Empêcher le touch callout sur iOS
        WebkitTouchCallout: 'none',
        // Empêcher le highlight sur tap mobile
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Contenu média avec styles de protection */}
      <div 
        className="protected-media-content"
        style={{
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
      
      {/* Overlay invisible pour bloquer les interactions directes */}
      <div 
        className="absolute inset-0 z-10"
        style={{ 
          background: 'transparent',
          pointerEvents: 'auto',
          cursor: 'default',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          // Bloquer le clic droit et le clic du milieu
          if (e.button === 2 || e.button === 1) {
            e.preventDefault();
          }
        }}
        onTouchStart={(e) => {
          // Bloquer le long press sur mobile (essayer de sauvegarder l'image)
          const target = e.target as HTMLElement;
          target.addEventListener('contextmenu', (ev) => ev.preventDefault(), { once: true });
        }}
      />
      
      {/* Motif de protection invisible (rend les screenshots moins exploitables) */}
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
      
      {/* Filigrane textuel si fourni */}
      {watermarkText && (
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