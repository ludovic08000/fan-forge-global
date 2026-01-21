import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, Check, Sun, Contrast, Droplets, Sparkles, Palette, CloudFog, 
  Flame, Snowflake, Moon, Heart, RotateCcw, Scissors, Image as ImageIcon,
  Type, Music, Play, Pause, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Filtres Instagram-like
const PHOTO_FILTERS = [
  { id: 'normal', name: 'Normal', icon: <Sparkles className="w-4 h-4" />, adjustments: {} },
  { id: 'clarendon', name: 'Clarendon', icon: <Sun className="w-4 h-4" />, adjustments: { contrast: 120, saturation: 135 } },
  { id: 'gingham', name: 'Gingham', icon: <CloudFog className="w-4 h-4" />, adjustments: { brightness: 105, hueRotate: -10 } },
  { id: 'moon', name: 'Moon', icon: <Moon className="w-4 h-4" />, adjustments: { grayscale: 100, contrast: 110, brightness: 110 } },
  { id: 'lark', name: 'Lark', icon: <Droplets className="w-4 h-4" />, adjustments: { contrast: 90, saturation: 150, brightness: 110 } },
  { id: 'reyes', name: 'Reyes', icon: <Palette className="w-4 h-4" />, adjustments: { sepia: 22, brightness: 110, contrast: 85, saturation: 75 } },
  { id: 'juno', name: 'Juno', icon: <Flame className="w-4 h-4" />, adjustments: { saturation: 140, contrast: 115, brightness: 105 } },
  { id: 'slumber', name: 'Slumber', icon: <Snowflake className="w-4 h-4" />, adjustments: { saturation: 66, brightness: 105, sepia: 10 } },
  { id: 'crema', name: 'Crema', icon: <Heart className="w-4 h-4" />, adjustments: { sepia: 50, contrast: 125, brightness: 115, saturation: 90 } },
  { id: 'ludwig', name: 'Ludwig', icon: <Contrast className="w-4 h-4" />, adjustments: { saturation: 150, contrast: 105, brightness: 105 } },
];

interface MediaPreviewEditorProps {
  file: File;
  onConfirm: (editedFile: File, thumbnailBlob?: Blob) => void;
  onCancel: () => void;
}

const MediaPreviewEditor: React.FC<MediaPreviewEditorProps> = ({ file, onConfirm, onCancel }) => {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Video specific states
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [coverTime, setCoverTime] = useState<number | null>(null);
  const [activeVideoTab, setActiveVideoTab] = useState('filters');
  
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize preview URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Apply filter preset
  const applyFilterPreset = (filterId: string) => {
    setSelectedFilter(filterId);
    const filter = PHOTO_FILTERS.find(f => f.id === filterId);
    if (filter?.adjustments) {
      setBrightness(filter.adjustments.brightness || 100);
      setContrast(filter.adjustments.contrast || 100);
      setSaturation(filter.adjustments.saturation || 100);
    } else {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
    }
  };

  // Get CSS filter string
  const getFilterStyle = useCallback((): React.CSSProperties => {
    const filter = PHOTO_FILTERS.find(f => f.id === selectedFilter);
    const parts: string[] = [];
    
    parts.push(`brightness(${brightness}%)`);
    parts.push(`contrast(${contrast}%)`);
    parts.push(`saturate(${saturation}%)`);
    
    if (filter?.adjustments.grayscale) {
      parts.push(`grayscale(${filter.adjustments.grayscale}%)`);
    }
    if (filter?.adjustments.sepia) {
      parts.push(`sepia(${filter.adjustments.sepia}%)`);
    }
    if (filter?.adjustments.hueRotate) {
      parts.push(`hue-rotate(${filter.adjustments.hueRotate}deg)`);
    }
    
    return { filter: parts.join(' ') };
  }, [selectedFilter, brightness, contrast, saturation]);

  // Apply filters manually to ImageData (Safari compatibility)
  const applyFiltersToCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const filter = PHOTO_FILTERS.find(f => f.id === selectedFilter);
    const isGrayscale = filter?.adjustments.grayscale;
    const sepiaAmount = (filter?.adjustments.sepia || 0) / 100;
    
    const bFactor = brightness / 100;
    const cFactor = contrast / 100;
    const sFactor = saturation / 100;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Grayscale
      if (isGrayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }
      
      // Sepia
      if (sepiaAmount > 0) {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r + (tr - r) * sepiaAmount;
        g = g + (tg - g) * sepiaAmount;
        b = b + (tb - b) * sepiaAmount;
      }
      
      // Saturation
      if (sFactor !== 1) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * sFactor;
        g = gray + (g - gray) * sFactor;
        b = gray + (b - gray) * sFactor;
      }
      
      // Brightness
      r *= bFactor;
      g *= bFactor;
      b *= bFactor;
      
      // Contrast
      r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
      g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
      b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;
      
      // Clamp
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [selectedFilter, brightness, contrast, saturation]);

  // Reset adjustments
  const handleReset = () => {
    setSelectedFilter('normal');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    if (isVideo) {
      setTrimStart(0);
      setTrimEnd(duration);
      setCoverTime(null);
    }
  };

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Loop within trim bounds
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setCoverFromCurrent = () => {
    if (videoRef.current) {
      setCoverTime(videoRef.current.currentTime);
      toast.success('Couverture définie');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Confirm and process
  const handleConfirm = async () => {
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Context not available');

      if (isImage && imageRef.current) {
        const img = imageRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        applyFiltersToCanvas(ctx, canvas.width, canvas.height);
        
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.9);
        });
        
        const editedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
        onConfirm(editedFile);
        
      } else if (isVideo && videoRef.current) {
        // For video, we return the original file with settings
        // The actual trimming/filtering would be done server-side or during upload
        let thumbnailBlob: Blob | undefined;
        
        if (coverTime !== null) {
          const video = videoRef.current;
          const currentPos = video.currentTime;
          video.currentTime = coverTime;
          await new Promise(r => setTimeout(r, 200));
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          applyFiltersToCanvas(ctx, canvas.width, canvas.height);
          
          thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.9);
          });
          
          video.currentTime = currentPos;
        }
        
        // Store settings in sessionStorage for upload process
        sessionStorage.setItem('videoEditSettings', JSON.stringify({
          trimStart,
          trimEnd,
          coverTime,
          filters: { brightness, contrast, saturation, selectedFilter }
        }));
        
        onConfirm(file, thumbnailBlob);
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-black border-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white font-semibold">
            {isImage ? '📷 Éditer la photo' : '🎬 Éditer la vidéo'}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-white hover:bg-white/10">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleConfirm} 
              disabled={isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirmer
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
          {isImage && (
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Preview"
              style={getFilterStyle()}
              className="max-w-full max-h-full object-contain rounded-lg"
              crossOrigin="anonymous"
            />
          )}
          
          {isVideo && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={previewUrl}
                style={getFilterStyle()}
                className="max-w-full max-h-full object-contain rounded-lg"
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
                loop
              />
              
              {/* Play/Pause overlay */}
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
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Video Timeline */}
        {isVideo && duration > 0 && (
          <div className="px-4 py-2 border-t border-white/10">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration}
              step={0.1}
              onValueChange={([v]) => seekTo(v)}
              className="cursor-pointer"
            />
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-t border-white/10 space-y-4 max-h-[40vh] overflow-y-auto">
          {isVideo && (
            <Tabs value={activeVideoTab} onValueChange={setActiveVideoTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/10">
                <TabsTrigger value="filters" className="text-white data-[state=active]:bg-primary">
                  <Palette className="w-4 h-4 mr-1" />
                  Filtres
                </TabsTrigger>
                <TabsTrigger value="trim" className="text-white data-[state=active]:bg-primary">
                  <Scissors className="w-4 h-4 mr-1" />
                  Trim
                </TabsTrigger>
                <TabsTrigger value="cover" className="text-white data-[state=active]:bg-primary">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Cover
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="trim" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Début: {formatTime(trimStart)}</label>
                  <Slider
                    value={[trimStart]}
                    min={0}
                    max={trimEnd - 1}
                    step={0.1}
                    onValueChange={([v]) => setTrimStart(v)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Fin: {formatTime(trimEnd)}</label>
                  <Slider
                    value={[trimEnd]}
                    min={trimStart + 1}
                    max={duration}
                    step={0.1}
                    onValueChange={([v]) => setTrimEnd(v)}
                  />
                </div>
                <p className="text-xs text-white/50">
                  Durée: {formatTime(trimEnd - trimStart)}
                </p>
              </TabsContent>
              
              <TabsContent value="cover" className="mt-4">
                <div className="text-center space-y-4">
                  <p className="text-white/70 text-sm">
                    Naviguez jusqu'à l'image souhaitée et cliquez pour définir la couverture
                  </p>
                  <Button onClick={setCoverFromCurrent} variant="outline" className="border-white/20 text-white">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Utiliser l'image actuelle
                  </Button>
                  {coverTime !== null && (
                    <p className="text-green-400 text-sm">
                      ✓ Couverture à {formatTime(coverTime)}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Filters - shown for both image and video filters tab */}
          {(isImage || activeVideoTab === 'filters') && (
            <>
              {/* Filter Presets */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {PHOTO_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyFilterPreset(filter.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      selectedFilter === filter.id 
                        ? 'bg-primary text-white' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {filter.icon}
                    <span className="text-xs">{filter.name}</span>
                  </button>
                ))}
              </div>

              {/* Adjustment Sliders */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-white/70 text-sm flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Luminosité
                  </label>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => setBrightness(v)}
                    min={50}
                    max={150}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white/70 text-sm flex items-center gap-2">
                    <Contrast className="w-4 h-4" /> Contraste
                  </label>
                  <Slider
                    value={[contrast]}
                    onValueChange={([v]) => setContrast(v)}
                    min={50}
                    max={150}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white/70 text-sm flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> Saturation
                  </label>
                  <Slider
                    value={[saturation]}
                    onValueChange={([v]) => setSaturation(v)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPreviewEditor;
