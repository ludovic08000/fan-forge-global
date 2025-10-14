import { ReactNode } from 'react';

interface ProtectedMediaProps {
  children: ReactNode;
  className?: string;
  watermarkText?: string;
}

/**
 * Composant pour protéger les médias avec un overlay invisible et un filigrane optionnel
 */
export const ProtectedMedia = ({ 
  children, 
  className = '',
  watermarkText 
}: ProtectedMediaProps) => {
  return (
    <div className={`relative protected-content ${className}`}>
      {children}
      
      {/* Overlay invisible pour bloquer les interactions directes */}
      <div 
        className="absolute inset-0 z-10 cursor-default"
        style={{ 
          background: 'transparent',
          pointerEvents: 'auto'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      
      {/* Filigrane textuel si fourni */}
      {watermarkText && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 200px, rgba(255,255,255,0.03) 200px, rgba(255,255,255,0.03) 400px)'
          }}
        >
          <div 
            className="text-white/10 text-4xl md:text-6xl font-bold transform rotate-[-30deg] select-none"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            {watermarkText}
          </div>
        </div>
      )}
    </div>
  );
};
