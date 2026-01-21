import React, { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, Camera, Grid3X3, Check } from 'lucide-react';

interface CoverPickerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  duration: number;
  currentCoverTime: number | null;
  onCoverSelect: (time: number) => void;
  onSeek: (time: number) => void;
  formatTime: (seconds: number) => string;
}

const CoverPicker: React.FC<CoverPickerProps> = ({
  videoRef,
  duration,
  currentCoverTime,
  onCoverSelect,
  onSeek,
  formatTime
}) => {
  const [thumbnails, setThumbnails] = useState<{ time: number; url: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number>(currentCoverTime ?? 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate thumbnail grid
  const generateThumbnails = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || duration === 0) return;

    setGenerating(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numThumbnails = 8;
    const interval = duration / numThumbnails;
    const newThumbnails: { time: number; url: string }[] = [];

    // Store current time to restore later
    const originalTime = video.currentTime;

    for (let i = 0; i < numThumbnails; i++) {
      const time = i * interval + interval / 2;
      
      try {
        // Seek to time
        video.currentTime = time;
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(true);
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Capture frame
        canvas.width = 160;
        canvas.height = 90;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const url = canvas.toDataURL('image/jpeg', 0.7);
        newThumbnails.push({ time, url });
      } catch (e) {
        console.error('Error generating thumbnail:', e);
      }
    }

    // Restore original time
    video.currentTime = originalTime;
    setThumbnails(newThumbnails);
    setGenerating(false);
  };

  // Generate thumbnails when duration is available
  useEffect(() => {
    if (duration > 0 && thumbnails.length === 0) {
      generateThumbnails();
    }
  }, [duration]);

  const handleSliderChange = (values: number[]) => {
    const time = values[0];
    setSelectedTime(time);
    onSeek(time);
  };

  const handleSelectCover = () => {
    onCoverSelect(selectedTime);
  };

  const handleThumbnailClick = (time: number) => {
    setSelectedTime(time);
    onSeek(time);
    onCoverSelect(time);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Image className="h-4 w-4" />
        <span>Choisissez la miniature de votre vidéo</span>
      </div>

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Thumbnail Grid */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sélection rapide</Label>
        <div className="grid grid-cols-4 gap-2">
          {generating ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i}
                className="aspect-video bg-muted rounded animate-pulse"
              />
            ))
          ) : (
            thumbnails.map(({ time, url }) => (
              <button
                key={time}
                onClick={() => handleThumbnailClick(time)}
                className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                  currentCoverTime !== null && Math.abs(currentCoverTime - time) < 0.5
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-transparent hover:border-primary/50'
                }`}
              >
                <img 
                  src={url} 
                  alt={`Frame at ${formatTime(time)}`}
                  className="w-full h-full object-cover"
                />
                {currentCoverTime !== null && Math.abs(currentCoverTime - time) < 0.5 && (
                  <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-0.5 text-center">
                  {formatTime(time)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Manual Selection Slider */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Sélection précise</Label>
        <Slider
          value={[selectedTime]}
          min={0}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSliderChange}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Position: {formatTime(selectedTime)}
          </span>
          <Button 
            size="sm" 
            onClick={handleSelectCover}
            variant={currentCoverTime === selectedTime ? "secondary" : "default"}
          >
            <Camera className="h-4 w-4 mr-1" />
            Capturer cette frame
          </Button>
        </div>
      </div>

      {/* Selected Cover Info */}
      {currentCoverTime !== null && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            Cover sélectionnée à <strong>{formatTime(currentCoverTime)}</strong>
          </span>
        </div>
      )}

      {/* Regenerate Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={generateThumbnails}
        disabled={generating}
      >
        <Grid3X3 className="h-4 w-4 mr-1" />
        Régénérer les miniatures
      </Button>
    </div>
  );
};

export default CoverPicker;
