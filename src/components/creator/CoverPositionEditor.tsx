import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Move, Check, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoverPositionEditorProps {
  coverUrl: string;
  initialPositionX: number;
  initialPositionY: number;
  onSave: (positionX: number, positionY: number) => Promise<void>;
}

const CoverPositionEditor: React.FC<CoverPositionEditorProps> = ({
  coverUrl,
  initialPositionX,
  initialPositionY,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [positionX, setPositionX] = useState(initialPositionX);
  const [positionY, setPositionY] = useState(initialPositionY);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPositionX(initialPositionX);
    setPositionY(initialPositionY);
  }, [initialPositionX, initialPositionY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate relative position (0-100%)
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    
    const percentX = Math.max(0, Math.min(100, (relativeX / containerRect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (relativeY / containerRect.height) * 100));
    
    setPositionX(percentX);
    setPositionY(percentY);
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
    
    const relativeX = touch.clientX - containerRect.left;
    const relativeY = touch.clientY - containerRect.top;
    
    const percentX = Math.max(0, Math.min(100, (relativeX / containerRect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (relativeY / containerRect.height) * 100));
    
    setPositionX(percentX);
    setPositionY(percentY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Math.round(positionX), Math.round(positionY));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPositionX(initialPositionX);
    setPositionY(initialPositionY);
    setOpen(false);
  };

  const handleReset = () => {
    setPositionX(50);
    setPositionY(50);
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
            Faites glisser l'image pour ajuster sa position
          </p>
        </DialogHeader>
        
        {/* Preview with real 3:1 aspect ratio matching profile */}
        <div 
          ref={containerRef}
          className="relative aspect-[3/1] overflow-hidden cursor-grab active:cursor-grabbing select-none mx-4 rounded-lg border"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.img
            src={coverUrl}
            alt="Couverture"
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${positionX}% ${positionY}%`,
            }}
            draggable={false}
            animate={{ 
              opacity: isDragging ? 0.9 : 1,
              scale: isDragging ? 1.02 : 1,
            }}
            transition={{ duration: 0.1 }}
          />
          
          {/* Crosshair indicator */}
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div 
              className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center bg-black/30"
              animate={{ 
                scale: isDragging ? 1.2 : 1,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-white" />
            </motion.div>
          </div>
          
          {/* Overlay with drag indicator */}
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-3">
            <motion.div 
              className="bg-black/60 text-white px-3 py-1.5 rounded-full flex items-center gap-2"
              animate={{ 
                opacity: isDragging ? 0.5 : 0.8,
              }}
            >
              <Move className="h-3 w-3" />
              <span className="text-xs font-medium">
                {isDragging ? 'Relâchez pour appliquer' : 'Glissez pour repositionner'}
              </span>
            </motion.div>
          </div>

          {/* Position indicator */}
          <div className="absolute right-2 top-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
            X: {Math.round(positionX)}% Y: {Math.round(positionY)}%
          </div>
        </div>

        {/* Preview info */}
        <div className="px-4 py-2 text-xs text-center text-muted-foreground">
          Aperçu de la zone visible sur votre profil
        </div>

        <div className="flex gap-2 p-4 pt-0">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleReset}
            disabled={saving}
            className="gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Centrer
          </Button>
          <div className="flex-1" />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          <Button 
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
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
