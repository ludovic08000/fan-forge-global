import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  SkipBack, SkipForward, PictureInPicture2, Loader2,
  RotateCcw, RotateCw, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface WatermarkInfo {
  username?: string;
  odentId?: string;
  date?: string;
}

interface PremiumVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onClose?: () => void;
  watermark?: WatermarkInfo;
}

export const PremiumVideoPlayer: React.FC<PremiumVideoPlayerProps> = ({
  src,
  poster,
  className,
  autoPlay = false,
  onEnded,
  onClose,
  watermark
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPiP, setIsPiP] = useState(false);
  const [showSkipIndicator, setShowSkipIndicator] = useState<'left' | 'right' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [showVolumeToast, setShowVolumeToast] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const doubleTapTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastTapTime = useRef<number>(0);
  const lastTapSide = useRef<'left' | 'right' | null>(null);

  // Format time
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  // Handle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      setShowVolumeToast(true);
      setTimeout(() => setShowVolumeToast(false), 1000);
    }
  }, []);

  // Handle seek
  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
    }
  }, [duration]);

  // Handle progress bar hover
  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverTime(percent * duration);
      setHoverPosition(e.clientX - rect.left);
    }
  }, [duration]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // Toggle Picture-in-Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, []);

  // Skip forward/backward with visual feedback
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(videoRef.current.currentTime + seconds, 0),
        duration
      );
      setShowSkipIndicator(seconds > 0 ? 'right' : 'left');
      setTimeout(() => setShowSkipIndicator(null), 500);
    }
  }, [duration]);

  // Handle click for play/pause - double tap on sides for skip (mobile)
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const now = Date.now();
    
    // Zones latérales (20% de chaque côté) pour le double-tap skip
    const isLeftZone = x < width * 0.2;
    const isRightZone = x > width * 0.8;
    
    if ((isLeftZone || isRightZone) && now - lastTapTime.current < 300 && lastTapSide.current === (isLeftZone ? 'left' : 'right')) {
      // Double tap sur les côtés - skip
      e.preventDefault();
      e.stopPropagation();
      skip(isRightZone ? 10 : -10);
      lastTapTime.current = 0;
      lastTapSide.current = null;
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
    } else if (isLeftZone || isRightZone) {
      // Premier tap sur les côtés - attendre double tap
      lastTapTime.current = now;
      lastTapSide.current = isLeftZone ? 'left' : 'right';
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
      doubleTapTimeout.current = setTimeout(() => {
        if (lastTapTime.current === now) {
          togglePlay(); // Simple tap = play/pause
        }
      }, 250);
    } else {
      // Clic au centre - play/pause immédiat
      togglePlay();
    }
  }, [skip, togglePlay]);

  // Handle playback rate change
  const cyclePlaybackRate = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
      setPlaybackRate(newRate);
    }
  }, [playbackRate]);

  // Show/hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onLoadedData = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onEnded_ = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const onLeavePiP = () => setIsPiP(false);
    const onEnterPiP = () => setIsPiP(true);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('progress', onProgress);
    video.addEventListener('ended', onEnded_);
    video.addEventListener('leavepictureinpicture', onLeavePiP);
    video.addEventListener('enterpictureinpicture', onEnterPiP);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('ended', onEnded_);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
    };
  }, [onEnded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'p':
          togglePiP();
          break;
        case 'arrowleft':
        case 'j':
          skip(-10);
          break;
        case 'arrowright':
        case 'l':
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange([Math.min(volume + 0.1, 1)]);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange([Math.max(volume - 0.1, 0)]);
          break;
        case '0':
        case 'home':
          if (videoRef.current) videoRef.current.currentTime = 0;
          break;
        case 'end':
          if (videoRef.current) videoRef.current.currentTime = duration;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePiP, skip, handleVolumeChange, volume, duration]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group bg-black rounded-xl overflow-hidden select-none",
        isFullscreen && "rounded-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setHoverTime(null);
      }}
    >
      {/* Video Error State */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 p-6">
          <div className="text-red-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white text-center font-medium mb-2">Impossible de lire cette vidéo</p>
          <p className="text-gray-400 text-center text-sm max-w-xs">
            {src.toLowerCase().includes('.mov') 
              ? 'Le format MOV n\'est pas supporté sur Windows/Android. Essayez depuis un iPhone ou Mac.'
              : 'Format vidéo non supporté par votre navigateur.'
            }
          </p>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture={false}
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          console.error('Video error:', e);
          const isMov = src.toLowerCase().includes('.mov');
          const isWindows = navigator.userAgent.includes('Windows');
          const isAndroid = navigator.userAgent.includes('Android');
          if (isMov && (isWindows || isAndroid)) {
            setVideoError('Format MOV non supporté sur ce navigateur');
          } else {
            setVideoError('Erreur de lecture vidéo');
          }
          setIsLoading(false);
        }}
      />

      {/* Dynamic forensic watermark overlay */}
      {watermark && (
        <div className="absolute inset-0 pointer-events-none select-none z-10" style={{ mixBlendMode: 'difference' }}>
          {/* Top-left watermark */}
          <div className="absolute top-[12%] left-[8%] opacity-[0.04] text-white text-[10px] font-mono rotate-[-15deg] whitespace-nowrap">
            {watermark.username || watermark.odentId} • {watermark.date}
          </div>
          {/* Center watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-white text-[11px] font-mono rotate-[20deg] whitespace-nowrap">
            {watermark.odentId} • {watermark.username}
          </div>
          {/* Bottom-right watermark */}
          <div className="absolute bottom-[18%] right-[6%] opacity-[0.04] text-white text-[10px] font-mono rotate-[-8deg] whitespace-nowrap">
            {watermark.date} • {watermark.odentId}
          </div>
          {/* Additional scattered marks for forensic tracing */}
          <div className="absolute top-[35%] right-[15%] opacity-[0.025] text-white text-[9px] font-mono rotate-[45deg] whitespace-nowrap">
            {watermark.odentId}
          </div>
          <div className="absolute bottom-[40%] left-[20%] opacity-[0.025] text-white text-[9px] font-mono rotate-[-30deg] whitespace-nowrap">
            {watermark.username}
          </div>
        </div>
      )}

      {/* Click overlay for play/pause & double-tap skip - excludes bottom controls area */}
      <div 
        className="absolute inset-0 bottom-24 cursor-pointer"
        onClick={handleVideoClick}
      />

      {/* Skip indicator - Left */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none transition-opacity duration-200",
        showSkipIndicator === 'left' ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="bg-black/60 rounded-full p-4 flex items-center gap-2">
          <RotateCcw className="h-8 w-8 text-white" />
          <span className="text-white font-bold">10s</span>
        </div>
      </div>

      {/* Skip indicator - Right */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none transition-opacity duration-200",
        showSkipIndicator === 'right' ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="bg-black/60 rounded-full p-4 flex items-center gap-2">
          <span className="text-white font-bold">10s</span>
          <RotateCw className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Volume toast */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 transition-opacity duration-200 pointer-events-none",
        showVolumeToast ? 'opacity-100' : 'opacity-0'
      )}>
        {isMuted || volume === 0 ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
        <div className="w-20 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
          />
        </div>
        <span className="text-white text-sm font-medium w-8">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 left-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-all text-white",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
          aria-label="Fermer la vidéo"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Play overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-5 rounded-full bg-primary/90 shadow-lg shadow-primary/30">
            <Play className="h-10 w-10 text-primary-foreground fill-primary-foreground ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 transition-all duration-300",
        showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
        
        <div className="relative px-4 pb-4 pt-8 space-y-2">
          {/* Progress bar */}
          <div 
            ref={progressRef}
            className="relative h-2 sm:h-1 sm:hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all group/progress touch-none"
            onClick={handleProgressClick}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const rect = progressRef.current?.getBoundingClientRect();
              if (rect && videoRef.current) {
                const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                videoRef.current.currentTime = percent * duration;
              }
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const rect = progressRef.current?.getBoundingClientRect();
              if (rect && videoRef.current) {
                const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                videoRef.current.currentTime = percent * duration;
              }
            }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffered */}
            <div 
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Progress */}
            <div 
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Thumb */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
            {/* Hover time preview */}
            {hoverTime !== null && (
              <div 
                className="absolute -top-10 -translate-x-1/2 bg-black/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-white" />
                )}
              </button>

              {/* Skip backward */}
              <button
                onClick={() => skip(-10)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label="Reculer de 10 secondes"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label="Avancer de 10 secondes"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/volume">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                  aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-200">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Time */}
              <span className="text-white text-xs sm:text-sm tabular-nums ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Playback rate */}
              <button
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded hover:bg-white/10 transition-colors text-white text-xs sm:text-sm font-medium min-w-[2.5rem]"
                aria-label="Vitesse de lecture"
              >
                {playbackRate}x
              </button>

              {/* Picture-in-Picture */}
              {document.pictureInPictureEnabled && (
                <button
                  onClick={togglePiP}
                  className={cn(
                    "p-2 rounded-full hover:bg-white/10 transition-colors text-white hidden sm:block",
                    isPiP && "bg-white/20"
                  )}
                  aria-label="Picture-in-Picture"
                >
                  <PictureInPicture2 className="h-5 w-5" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint (shown on first hover) */}
      <div className={cn(
        "absolute top-4 right-4 text-white/60 text-xs space-y-1 pointer-events-none transition-opacity duration-300",
        showControls && !isPlaying ? "opacity-100" : "opacity-0"
      )}>
        <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
          <kbd className="font-mono">Espace</kbd> Lecture/Pause
        </div>
      </div>
    </div>
  );
};

export default PremiumVideoPlayer;