import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  X, Check, Sun, Contrast, Droplets, Sparkles, Palette, CloudFog, 
  Flame, Snowflake, Moon, Heart, RotateCcw, Scissors, Image as ImageIcon,
  Play, Pause, Loader2, Wand2, CircleDot, Zap, Waves, 
  Mountain, Sunset, TreePine, Building, Camera, Star, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Premium Instagram-like filters with more variety
const PHOTO_FILTERS = [
  // Basic
  { id: 'normal', name: 'Original', icon: <Camera className="w-4 h-4" />, category: 'basic', adjustments: {} },
  
  // Warm tones
  { id: 'clarendon', name: 'Clarendon', icon: <Sun className="w-4 h-4" />, category: 'warm', adjustments: { contrast: 120, saturation: 135 } },
  { id: 'juno', name: 'Juno', icon: <Flame className="w-4 h-4" />, category: 'warm', adjustments: { saturation: 140, contrast: 115, brightness: 105 } },
  { id: 'rise', name: 'Rise', icon: <Sunset className="w-4 h-4" />, category: 'warm', adjustments: { brightness: 110, saturation: 110, sepia: 15 } },
  { id: 'nashville', name: 'Nashville', icon: <Star className="w-4 h-4" />, category: 'warm', adjustments: { brightness: 115, contrast: 90, saturation: 120, sepia: 20 } },
  { id: 'valencia', name: 'Valencia', icon: <Heart className="w-4 h-4" />, category: 'warm', adjustments: { brightness: 108, contrast: 108, saturation: 85, sepia: 18 } },
  
  // Cool tones
  { id: 'gingham', name: 'Gingham', icon: <CloudFog className="w-4 h-4" />, category: 'cool', adjustments: { brightness: 105, hueRotate: -10, saturation: 90 } },
  { id: 'hudson', name: 'Hudson', icon: <Waves className="w-4 h-4" />, category: 'cool', adjustments: { brightness: 120, contrast: 90, saturation: 80, hueRotate: 30 } },
  { id: 'brooklyn', name: 'Brooklyn', icon: <Building className="w-4 h-4" />, category: 'cool', adjustments: { brightness: 110, contrast: 90, saturation: 90, hueRotate: -15 } },
  { id: 'slumber', name: 'Slumber', icon: <Snowflake className="w-4 h-4" />, category: 'cool', adjustments: { saturation: 66, brightness: 105, sepia: 10 } },
  
  // B&W and Vintage
  { id: 'moon', name: 'Moon', icon: <Moon className="w-4 h-4" />, category: 'bw', adjustments: { grayscale: 100, contrast: 110, brightness: 110 } },
  { id: 'inkwell', name: 'Inkwell', icon: <CircleDot className="w-4 h-4" />, category: 'bw', adjustments: { grayscale: 100, contrast: 130, brightness: 95 } },
  { id: 'willow', name: 'Willow', icon: <TreePine className="w-4 h-4" />, category: 'bw', adjustments: { grayscale: 100, contrast: 95, brightness: 90 } },
  
  // Vintage
  { id: 'reyes', name: 'Reyes', icon: <Palette className="w-4 h-4" />, category: 'vintage', adjustments: { sepia: 22, brightness: 110, contrast: 85, saturation: 75 } },
  { id: 'crema', name: 'Crema', icon: <Droplets className="w-4 h-4" />, category: 'vintage', adjustments: { sepia: 50, contrast: 125, brightness: 115, saturation: 90 } },
  { id: 'aden', name: 'Aden', icon: <Mountain className="w-4 h-4" />, category: 'vintage', adjustments: { brightness: 120, saturation: 85, contrast: 90, sepia: 20 } },
  { id: 'perpetua', name: 'Perpetua', icon: <Sparkles className="w-4 h-4" />, category: 'vintage', adjustments: { brightness: 105, saturation: 110, contrast: 105, sepia: 10 } },
  
  // Vivid
  { id: 'lark', name: 'Lark', icon: <Zap className="w-4 h-4" />, category: 'vivid', adjustments: { contrast: 90, saturation: 150, brightness: 110 } },
  { id: 'ludwig', name: 'Ludwig', icon: <Contrast className="w-4 h-4" />, category: 'vivid', adjustments: { saturation: 150, contrast: 105, brightness: 105 } },
  { id: 'pop', name: 'Pop', icon: <Wand2 className="w-4 h-4" />, category: 'vivid', adjustments: { saturation: 180, contrast: 120, brightness: 105 } },
  { id: 'punch', name: 'Punch', icon: <Crown className="w-4 h-4" />, category: 'vivid', adjustments: { saturation: 160, contrast: 130, brightness: 100 } },
];

const FILTER_CATEGORIES = [
  { id: 'all', name: 'Tous', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'warm', name: 'Chaud', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'cool', name: 'Froid', icon: <Snowflake className="w-3.5 h-3.5" /> },
  { id: 'bw', name: 'N&B', icon: <Moon className="w-3.5 h-3.5" /> },
  { id: 'vintage', name: 'Vintage', icon: <Camera className="w-3.5 h-3.5" /> },
  { id: 'vivid', name: 'Vif', icon: <Zap className="w-3.5 h-3.5" /> },
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [fade, setFade] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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

  // Get filtered filters
  const filteredFilters = selectedCategory === 'all' 
    ? PHOTO_FILTERS 
    : PHOTO_FILTERS.filter(f => f.category === selectedCategory || f.id === 'normal');

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
    
    // Warmth via hue-rotate
    if (warmth !== 0) {
      parts.push(`hue-rotate(${warmth * 0.5}deg)`);
    }
    
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
  }, [selectedFilter, brightness, contrast, saturation, warmth]);

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
    const fadeAmount = fade / 100;
    
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
      
      // Warmth
      if (warmth !== 0) {
        r += warmth * 0.3;
        b -= warmth * 0.3;
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
      
      // Fade (lift shadows)
      if (fadeAmount > 0) {
        r = r + (255 - r) * fadeAmount * 0.3;
        g = g + (255 - g) * fadeAmount * 0.3;
        b = b + (255 - b) * fadeAmount * 0.3;
      }
      
      // Clamp
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Apply vignette
    if (vignette > 0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(width, height) / 2;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Apply grain
    if (grain > 0) {
      const grainData = ctx.getImageData(0, 0, width, height);
      const grainPixels = grainData.data;
      const grainIntensity = grain * 0.5;
      for (let i = 0; i < grainPixels.length; i += 4) {
        const noise = (Math.random() - 0.5) * grainIntensity;
        grainPixels[i] += noise;
        grainPixels[i + 1] += noise;
        grainPixels[i + 2] += noise;
      }
      ctx.putImageData(grainData, 0, 0);
    }
  }, [selectedFilter, brightness, contrast, saturation, warmth, vignette, grain, fade]);

  // Reset adjustments
  const handleReset = () => {
    setSelectedFilter('normal');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setVignette(0);
    setGrain(0);
    setFade(0);
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
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.92);
        });
        
        const editedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
        onConfirm(editedFile);
        
      } else if (isVideo && videoRef.current) {
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
        
        sessionStorage.setItem('videoEditSettings', JSON.stringify({
          trimStart,
          trimEnd,
          coverTime,
          filters: { brightness, contrast, saturation, selectedFilter, warmth, vignette, grain, fade }
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
      <DialogContent className="max-w-5xl h-[95vh] p-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 border-none flex flex-col overflow-hidden">
        {/* Premium Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-sm">
          <button 
            onClick={onCancel} 
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              {isImage ? <Camera className="w-5 h-5 text-primary" /> : <Play className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">
                {isImage ? 'Édition Photo' : 'Édition Vidéo'}
              </h2>
              <p className="text-white/40 text-xs">Filtres premium</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset} 
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full px-4"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleConfirm} 
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-full px-5 shadow-lg shadow-primary/25 transition-all duration-200"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Appliquer
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden min-h-0 relative">
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
            {isImage && (
              <motion.img
                ref={imageRef}
                src={previewUrl}
                alt="Preview"
                style={getFilterStyle()}
                className="max-w-full max-h-[50vh] object-contain"
                crossOrigin="anonymous"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            
            {isVideo && (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={previewUrl}
                  style={getFilterStyle()}
                  className="max-w-full max-h-[50vh] object-contain"
                  onLoadedMetadata={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                  loop
                />
                
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <motion.div 
                    className="bg-black/60 backdrop-blur-sm rounded-full p-5 ring-1 ring-white/20"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 text-white" />
                    ) : (
                      <Play className="h-8 w-8 text-white fill-white" />
                    )}
                  </motion.div>
                </button>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Video Timeline */}
        {isVideo && duration > 0 && (
          <div className="px-6 py-3 border-t border-white/5">
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="font-mono">{formatTime(duration)}</span>
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

        {/* Controls Panel */}
        <div className="border-t border-white/10 bg-black/40 backdrop-blur-sm">
          {isVideo && (
            <Tabs value={activeVideoTab} onValueChange={setActiveVideoTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-white/5 rounded-none h-12">
                <TabsTrigger 
                  value="filters" 
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Filtres
                </TabsTrigger>
                <TabsTrigger 
                  value="trim" 
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Découpe
                </TabsTrigger>
                <TabsTrigger 
                  value="cover" 
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Couverture
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="trim" className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm font-medium">Début</label>
                      <span className="text-primary text-sm font-mono">{formatTime(trimStart)}</span>
                    </div>
                    <Slider
                      value={[trimStart]}
                      min={0}
                      max={trimEnd - 1}
                      step={0.1}
                      onValueChange={([v]) => setTrimStart(v)}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm font-medium">Fin</label>
                      <span className="text-primary text-sm font-mono">{formatTime(trimEnd)}</span>
                    </div>
                    <Slider
                      value={[trimEnd]}
                      min={trimStart + 1}
                      max={duration}
                      step={0.1}
                      onValueChange={([v]) => setTrimEnd(v)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center pt-2">
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                    <Scissors className="w-3 h-3 mr-1.5" />
                    Durée: {formatTime(trimEnd - trimStart)}
                  </Badge>
                </div>
              </TabsContent>
              
              <TabsContent value="cover" className="p-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-2">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-white/60 text-sm max-w-md mx-auto">
                    Naviguez dans la vidéo pour sélectionner l'image de couverture parfaite
                  </p>
                  <Button 
                    onClick={setCoverFromCurrent} 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10 rounded-full px-6"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capturer l'image actuelle
                  </Button>
                  <AnimatePresence>
                    {coverTime !== null && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 text-green-400"
                      >
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Couverture définie à {formatTime(coverTime)}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Filters Panel */}
          {(isImage || activeVideoTab === 'filters') && (
            <div className={`${isVideo ? '' : 'p-4'} space-y-4`}>
              {/* Category Pills */}
              <div className={`${isVideo ? 'px-4 pt-4' : ''}`}>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    {FILTER_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          selectedCategory === cat.id 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {cat.icon}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Filter Grid */}
              <div className={`${isVideo ? 'px-4' : ''}`}>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-3">
                    <AnimatePresence mode="popLayout">
                      {filteredFilters.map((filter, index) => (
                        <motion.button
                          key={filter.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => applyFilterPreset(filter.id)}
                          className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-200 group ${
                            selectedFilter === filter.id ? 'scale-105' : ''
                          }`}
                        >
                          <div 
                            className={`relative w-20 h-20 rounded-xl overflow-hidden ring-2 transition-all duration-200 ${
                              selectedFilter === filter.id 
                                ? 'ring-primary shadow-lg shadow-primary/30' 
                                : 'ring-white/10 group-hover:ring-white/30'
                            }`}
                          >
                            <img 
                              src={previewUrl}
                              alt={filter.name}
                              className="w-full h-full object-cover"
                              style={{
                                filter: (() => {
                                  const parts: string[] = [];
                                  parts.push(`brightness(${filter.adjustments.brightness || 100}%)`);
                                  parts.push(`contrast(${filter.adjustments.contrast || 100}%)`);
                                  parts.push(`saturate(${filter.adjustments.saturation || 100}%)`);
                                  if (filter.adjustments.grayscale) parts.push(`grayscale(${filter.adjustments.grayscale}%)`);
                                  if (filter.adjustments.sepia) parts.push(`sepia(${filter.adjustments.sepia}%)`);
                                  if (filter.adjustments.hueRotate) parts.push(`hue-rotate(${filter.adjustments.hueRotate}deg)`);
                                  return parts.join(' ');
                                })()
                              }}
                            />
                            {selectedFilter === filter.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-6 h-6 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-medium transition-colors ${
                            selectedFilter === filter.id ? 'text-primary' : 'text-white/60 group-hover:text-white'
                          }`}>
                            {filter.name}
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Adjustments */}
              <div className={`space-y-4 ${isVideo ? 'px-4 pb-4' : ''}`}>
                {/* Toggle Advanced */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Ajustements {showAdvanced ? 'basiques' : 'avancés'}</span>
                  <motion.span 
                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                    className="text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Basic Adjustments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/60 text-xs flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5" /> Luminosité
                      </label>
                      <span className="text-primary text-xs font-mono">{brightness}%</span>
                    </div>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={50}
                      max={150}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/60 text-xs flex items-center gap-1.5">
                        <Contrast className="w-3.5 h-3.5" /> Contraste
                      </label>
                      <span className="text-primary text-xs font-mono">{contrast}%</span>
                    </div>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={50}
                      max={150}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/60 text-xs flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5" /> Saturation
                      </label>
                      <span className="text-primary text-xs font-mono">{saturation}%</span>
                    </div>
                    <Slider
                      value={[saturation]}
                      onValueChange={([v]) => setSaturation(v)}
                      min={0}
                      max={200}
                      step={1}
                    />
                  </div>

                  {/* Advanced Adjustments */}
                  <AnimatePresence>
                    {showAdvanced && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-white/60 text-xs flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5" /> Chaleur
                            </label>
                            <span className="text-primary text-xs font-mono">{warmth > 0 ? '+' : ''}{warmth}</span>
                          </div>
                          <Slider
                            value={[warmth]}
                            onValueChange={([v]) => setWarmth(v)}
                            min={-50}
                            max={50}
                            step={1}
                          />
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-white/60 text-xs flex items-center gap-1.5">
                              <CircleDot className="w-3.5 h-3.5" /> Vignette
                            </label>
                            <span className="text-primary text-xs font-mono">{vignette}%</span>
                          </div>
                          <Slider
                            value={[vignette]}
                            onValueChange={([v]) => setVignette(v)}
                            min={0}
                            max={100}
                            step={1}
                          />
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-white/60 text-xs flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Grain
                            </label>
                            <span className="text-primary text-xs font-mono">{grain}%</span>
                          </div>
                          <Slider
                            value={[grain]}
                            onValueChange={([v]) => setGrain(v)}
                            min={0}
                            max={100}
                            step={1}
                          />
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 md:col-span-3"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-white/60 text-xs flex items-center gap-1.5">
                              <CloudFog className="w-3.5 h-3.5" /> Fade
                            </label>
                            <span className="text-primary text-xs font-mono">{fade}%</span>
                          </div>
                          <Slider
                            value={[fade]}
                            onValueChange={([v]) => setFade(v)}
                            min={0}
                            max={100}
                            step={1}
                          />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPreviewEditor;
