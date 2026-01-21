import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Scissors, Clock } from 'lucide-react';

interface VideoTrimmerProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
  formatTime: (seconds: number) => string;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  duration,
  trimStart,
  trimEnd,
  onTrimChange,
  onSeek,
  formatTime
}) => {
  const trimDuration = trimEnd - trimStart;
  const trimPercentage = duration > 0 ? ((trimDuration / duration) * 100).toFixed(1) : '100';

  const handleStartChange = (values: number[]) => {
    const newStart = values[0];
    // Ensure start is before end with at least 1 second gap
    if (newStart < trimEnd - 1) {
      onTrimChange(newStart, trimEnd);
      onSeek(newStart);
    }
  };

  const handleEndChange = (values: number[]) => {
    const newEnd = values[0];
    // Ensure end is after start with at least 1 second gap
    if (newEnd > trimStart + 1) {
      onTrimChange(trimStart, newEnd);
      onSeek(newEnd - 0.5);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Scissors className="h-4 w-4" />
        <span>Définissez le début et la fin de votre vidéo</span>
      </div>

      {/* Trim visualization */}
      <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
        {/* Full duration background */}
        <div className="absolute inset-0 bg-muted" />
        
        {/* Selected trim range */}
        <div 
          className="absolute h-full bg-primary/30 border-x-2 border-primary"
          style={{
            left: `${(trimStart / duration) * 100}%`,
            width: `${((trimEnd - trimStart) / duration) * 100}%`
          }}
        />
        
        {/* Time markers */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-primary"
          style={{ left: `${(trimStart / duration) * 100}%` }}
        />
        <div 
          className="absolute top-0 h-full w-0.5 bg-primary"
          style={{ left: `${(trimEnd / duration) * 100}%` }}
        />
      </div>

      {/* Start Time Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Début</Label>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {formatTime(trimStart)}
          </span>
        </div>
        <Slider
          value={[trimStart]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleStartChange}
        />
      </div>

      {/* End Time Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Fin</Label>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {formatTime(trimEnd)}
          </span>
        </div>
        <Slider
          value={[trimEnd]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleEndChange}
        />
      </div>

      {/* Duration Info */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Durée finale</span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold">{formatTime(trimDuration)}</span>
          <span className="text-xs text-muted-foreground ml-2">({trimPercentage}%)</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onTrimChange(0, duration)}
        >
          Vidéo complète
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onTrimChange(0, Math.min(30, duration))}
          disabled={duration < 30}
        >
          30 premières sec.
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onTrimChange(Math.max(0, duration - 30), duration)}
          disabled={duration < 30}
        >
          30 dernières sec.
        </Button>
      </div>
    </div>
  );
};

export default VideoTrimmer;
