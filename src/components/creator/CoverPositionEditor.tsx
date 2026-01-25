import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Move, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoverPositionEditorProps {
  coverUrl: string;
  initialPosition: number;
  onSave: (position: number) => Promise<void>;
}

const CoverPositionEditor: React.FC<CoverPositionEditorProps> = ({
  coverUrl,
  initialPosition,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageHeight = imageRef.current.naturalHeight;
    const containerHeight = containerRect.height;
    
    // Calculate relative Y position (0-100%)
    const relativeY = e.clientY - containerRect.top;
    const percentage = Math.max(0, Math.min(100, (relativeY / containerHeight) * 100));
    
    setPosition(percentage);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const relativeY = touch.clientY - containerRect.top;
    const percentage = Math.max(0, Math.min(100, (relativeY / containerRect.height) * 100));
    
    setPosition(percentage);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Math.round(position));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPosition(initialPosition);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Move className="h-4 w-4" />
          Repositionner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Repositionner la couverture
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Faites glisser l'image verticalement pour ajuster sa position
          </p>
        </DialogHeader>
        
        <div 
          ref={containerRef}
          className="relative h-48 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.img
            ref={imageRef}
            src={coverUrl}
            alt="Couverture"
            className="w-full h-auto min-h-full absolute left-0"
            style={{
              objectFit: 'cover',
              objectPosition: `center ${position}%`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            draggable={false}
            animate={{ 
              opacity: isDragging ? 0.9 : 1,
            }}
          />
          
          {/* Overlay with drag indicator */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div 
              className="bg-black/60 text-white px-4 py-2 rounded-full flex items-center gap-2"
              animate={{ 
                opacity: isDragging ? 1 : 0.7,
                scale: isDragging ? 1.05 : 1,
              }}
            >
              <Move className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isDragging ? 'Relâchez pour appliquer' : 'Glissez pour repositionner'}
              </span>
            </motion.div>
          </div>

          {/* Position indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white px-2 py-1 rounded text-xs">
            {Math.round(position)}%
          </div>
        </div>

        {/* Preview lines showing crop area */}
        <div className="px-4 py-2 bg-muted/50 text-xs text-center text-muted-foreground">
          Aperçu de la zone visible sur votre profil
        </div>

        <div className="flex gap-2 p-4 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button 
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverPositionEditor;
