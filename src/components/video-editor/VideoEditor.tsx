import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Scissors, 
  Image as ImageIcon, 
  Type, 
  Music, 
  Palette, 
  Play, 
  Pause, 
  RotateCcw,
  Check,
  X,
  Upload,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import VideoTrimmer from './VideoTrimmer';
import CoverPicker from './CoverPicker';
import TextOverlay from './TextOverlay';
import MusicSelector from './MusicSelector';
import VideoFilters from './VideoFilters';
import { useVideoEditor, VideoEditSettings } from '@/hooks/useVideoEditor';

interface VideoEditorProps {
  videoFile: File;
  onSave: (settings: VideoEditSettings, coverBlob: Blob | null) => Promise<void>;
  onCancel: () => void;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ videoFile, onSave, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('trim');
  const [saving, setSaving] = useState(false);

  const {
    settings,
    updateTrim,
    updateCover,
    updateTextOverlay,
    updateMusic,
    updateFilters,
    resetSettings
  } = useVideoEditor();

  // Initialize video URL
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      updateTrim(0, videoDuration);
    }
  }, [updateTrim]);

  // Update current time while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop within trim bounds
      if (video.currentTime >= settings.trimEnd) {
        video.currentTime = settings.trimStart;
        if (!isPlaying) {
          video.pause();
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [settings.trimStart, settings.trimEnd, isPlaying]);

  // Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < settings.trimStart || video.currentTime >= settings.trimEnd) {
        video.currentTime = settings.trimStart;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Capture current frame as cover
  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply filters to canvas
    if (settings.filters) {
      ctx.filter = `brightness(${settings.filters.brightness}%) contrast(${settings.filters.contrast}%) saturate(${settings.filters.saturation}%)`;
      ctx.drawImage(canvas, 0, 0);
    }

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    }) as unknown as Blob | null;
  }, [settings.filters]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      // Capture cover frame if selected
      let coverBlob: Blob | null = null;
      if (settings.coverTime !== null && videoRef.current) {
        const currentPos = videoRef.current.currentTime;
        videoRef.current.currentTime = settings.coverTime;
        
        // Wait for seek to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            coverBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
            });
          }
        }
        
        videoRef.current.currentTime = currentPos;
      }

      await onSave(settings, coverBlob);
      toast.success('Paramètres vidéo enregistrés');
    } catch (error) {
      console.error('Error saving video settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Format time to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate CSS filter string for preview
  const getFilterStyle = (): React.CSSProperties => {
    if (!settings.filters) return {};
    return {
      filter: `brightness(${settings.filters.brightness}%) contrast(${settings.filters.contrast}%) saturate(${settings.filters.saturation}%)`
    };
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Éditeur Vidéo
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Appliquer
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            style={getFilterStyle()}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
          />
          
          {/* Text Overlay Preview */}
          {settings.textOverlay && (
            <div 
              className="absolute pointer-events-none"
              style={{
                left: `${settings.textOverlay.x}%`,
                top: `${settings.textOverlay.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${settings.textOverlay.size}px`,
                color: settings.textOverlay.color,
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap'
              }}
            >
              {settings.textOverlay.text}
            </div>
          )}

          {/* Play/Pause Button Overlay */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="bg-black/50 rounded-full p-4">
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white fill-white" />
              )}
            </div>
          </button>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Timeline / Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 1}
            step={0.1}
            onValueChange={([value]) => seekTo(value)}
            className="cursor-pointer"
          />
        </div>

        {/* Editing Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trim" className="flex items-center gap-1 text-xs sm:text-sm">
              <Scissors className="h-4 w-4" />
              <span className="hidden sm:inline">Trim</span>
            </TabsTrigger>
            <TabsTrigger value="cover" className="flex items-center gap-1 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Cover</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-1 text-xs sm:text-sm">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Texte</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-1 text-xs sm:text-sm">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Musique</span>
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center gap-1 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trim" className="mt-4">
            <VideoTrimmer
              duration={duration}
              trimStart={settings.trimStart}
              trimEnd={settings.trimEnd}
              onTrimChange={updateTrim}
              onSeek={seekTo}
              formatTime={formatTime}
            />
          </TabsContent>

          <TabsContent value="cover" className="mt-4">
            <CoverPicker
              videoRef={videoRef}
              duration={duration}
              currentCoverTime={settings.coverTime}
              onCoverSelect={(time) => updateCover(time)}
              onSeek={seekTo}
              formatTime={formatTime}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <TextOverlay
              textOverlay={settings.textOverlay}
              onTextChange={updateTextOverlay}
            />
          </TabsContent>

          <TabsContent value="music" className="mt-4">
            <MusicSelector
              music={settings.music}
              videoDuration={duration}
              trimStart={settings.trimStart}
              trimEnd={settings.trimEnd}
              onMusicChange={updateMusic}
            />
          </TabsContent>

          <TabsContent value="filters" className="mt-4">
            <VideoFilters
              filters={settings.filters}
              onFiltersChange={updateFilters}
            />
          </TabsContent>
        </Tabs>

        {/* Reset Button */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" onClick={resetSettings}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoEditor;
