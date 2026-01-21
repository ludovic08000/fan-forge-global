import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Type, X, Move } from 'lucide-react';
import { TextOverlaySettings } from '@/hooks/useVideoEditor';

interface TextOverlayProps {
  textOverlay: TextOverlaySettings | null;
  onTextChange: (settings: TextOverlaySettings | null) => void;
}

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FF6B00', // Orange
  '#8B5CF6', // Purple
];

const TextOverlay: React.FC<TextOverlayProps> = ({ textOverlay, onTextChange }) => {
  const isEnabled = textOverlay !== null;

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onTextChange({
        text: 'Votre texte',
        x: 50,
        y: 50,
        size: 32,
        color: '#FFFFFF'
      });
    } else {
      onTextChange(null);
    }
  };

  const updateField = <K extends keyof TextOverlaySettings>(
    field: K, 
    value: TextOverlaySettings[K]
  ) => {
    if (!textOverlay) return;
    onTextChange({ ...textOverlay, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Type className="h-4 w-4" />
        <span>Ajoutez du texte statique sur votre vidéo</span>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <span className="font-medium">Activer le texte</span>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      </div>

      {isEnabled && textOverlay && (
        <>
          {/* Text Input */}
          <div className="space-y-2">
            <Label>Texte</Label>
            <Input
              value={textOverlay.text}
              onChange={(e) => updateField('text', e.target.value)}
              placeholder="Entrez votre texte..."
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {textOverlay.text.length}/100 caractères
            </p>
          </div>

          {/* Position Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4" />
              <Label>Position</Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Horizontal</span>
                  <span>{textOverlay.x}%</span>
                </div>
                <Slider
                  value={[textOverlay.x]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => updateField('x', value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Vertical</span>
                  <span>{textOverlay.y}%</span>
                </div>
                <Slider
                  value={[textOverlay.y]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => updateField('y', value)}
                />
              </div>
            </div>

            {/* Quick Position Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { updateField('x', 50); updateField('y', 10); }}
              >
                Haut
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { updateField('x', 50); updateField('y', 50); }}
              >
                Centre
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { updateField('x', 50); updateField('y', 90); }}
              >
                Bas
              </Button>
            </div>
          </div>

          {/* Size Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Taille</Label>
              <span>{textOverlay.size}px</span>
            </div>
            <Slider
              value={[textOverlay.size]}
              min={12}
              max={72}
              step={2}
              onValueChange={([value]) => updateField('size', value)}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateField('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    textOverlay.color === color 
                      ? 'border-primary scale-110' 
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                  style={{ 
                    backgroundColor: color,
                    boxShadow: color === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined
                  }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={textOverlay.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer opacity-0 absolute inset-0"
                />
                <div 
                  className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center"
                >
                  <span className="text-xs">+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Button */}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onTextChange(null)}
          >
            <X className="h-4 w-4 mr-1" />
            Supprimer le texte
          </Button>
        </>
      )}
    </div>
  );
};

export default TextOverlay;
