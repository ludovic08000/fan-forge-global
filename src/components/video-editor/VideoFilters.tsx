import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Palette, 
  Sun, 
  Contrast, 
  Droplets,
  RotateCcw
} from 'lucide-react';
import { FilterSettings } from '@/hooks/useVideoEditor';

interface VideoFiltersProps {
  filters: FilterSettings;
  onFiltersChange: (filters: FilterSettings) => void;
}

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100
};

const PRESETS: { name: string; filters: FilterSettings }[] = [
  { name: 'Normal', filters: { brightness: 100, contrast: 100, saturation: 100 } },
  { name: 'Lumineux', filters: { brightness: 115, contrast: 105, saturation: 100 } },
  { name: 'Sombre', filters: { brightness: 85, contrast: 110, saturation: 90 } },
  { name: 'Vibrant', filters: { brightness: 105, contrast: 110, saturation: 130 } },
  { name: 'Doux', filters: { brightness: 105, contrast: 90, saturation: 95 } },
  { name: 'N&B', filters: { brightness: 100, contrast: 110, saturation: 0 } },
  { name: 'Vintage', filters: { brightness: 95, contrast: 95, saturation: 80 } },
  { name: 'Froid', filters: { brightness: 100, contrast: 105, saturation: 85 } },
];

const VideoFilters: React.FC<VideoFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilter = <K extends keyof FilterSettings>(
    key: K,
    value: FilterSettings[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const applyPreset = (preset: FilterSettings) => {
    onFiltersChange(preset);
  };

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const isModified = 
    filters.brightness !== 100 || 
    filters.contrast !== 100 || 
    filters.saturation !== 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Palette className="h-4 w-4" />
        <span>Ajustez les couleurs de votre vidéo</span>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label>Filtres rapides</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const isActive = 
              filters.brightness === preset.filters.brightness &&
              filters.contrast === preset.filters.contrast &&
              filters.saturation === preset.filters.saturation;
            
            return (
              <Button
                key={preset.name}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(preset.filters)}
                className="text-xs"
              >
                {preset.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Manual Controls */}
      <div className="space-y-5">
        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Label>Luminosité</Label>
            </div>
            <span className="text-sm font-mono w-12 text-right">
              {filters.brightness}%
            </span>
          </div>
          <Slider
            value={[filters.brightness]}
            min={50}
            max={150}
            step={5}
            onValueChange={([value]) => updateFilter('brightness', value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sombre</span>
            <span>Normal</span>
            <span>Lumineux</span>
          </div>
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Contrast className="h-4 w-4" />
              <Label>Contraste</Label>
            </div>
            <span className="text-sm font-mono w-12 text-right">
              {filters.contrast}%
            </span>
          </div>
          <Slider
            value={[filters.contrast]}
            min={50}
            max={150}
            step={5}
            onValueChange={([value]) => updateFilter('contrast', value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Plat</span>
            <span>Normal</span>
            <span>Contrasté</span>
          </div>
        </div>

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              <Label>Saturation</Label>
            </div>
            <span className="text-sm font-mono w-12 text-right">
              {filters.saturation}%
            </span>
          </div>
          <Slider
            value={[filters.saturation]}
            min={0}
            max={200}
            step={5}
            onValueChange={([value]) => updateFilter('saturation', value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>N&B</span>
            <span>Normal</span>
            <span>Saturé</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      {isModified && (
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Réinitialiser les filtres
        </Button>
      )}

      {/* Info */}
      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
        <p>
          Les filtres sont appliqués en temps réel dans l'aperçu. 
          Le rendu final sera effectué côté serveur pour une qualité optimale.
        </p>
      </div>
    </div>
  );
};

export default VideoFilters;
