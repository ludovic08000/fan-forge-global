import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Heart, Eye, Play, Lock, X, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProtectedMedia } from '@/components/ProtectedMedia';

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  content_type: 'image' | 'video';
  is_premium: boolean;
  like_count: number;
  view_count: number;
  duration?: number;
}

interface PremiumGalleryProps {
  items: GalleryItem[];
  isSubscribed: boolean;
  creatorName?: string;
  onLike?: (itemId: string) => void;
  likedItems?: Set<string>;
  className?: string;
}

export const PremiumGallery: React.FC<PremiumGalleryProps> = ({
  items,
  isSubscribed,
  creatorName,
  onLike,
  likedItems = new Set(),
  className
}) => {
  const { user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localLikedItems, setLocalLikedItems] = useState<Set<string>>(likedItems);
  const [localLikeCounts, setLocalLikeCounts] = useState<Map<string, number>>(
    new Map(items.map(item => [item.id, item.like_count]))
  );
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  // Lazy loading avec IntersectionObserver
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const handleImageRef = useCallback((el: HTMLImageElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  }, []);

  const handleLike = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    if (!user) {
      toast.info('Connectez-vous pour liker');
      return;
    }

    const isLiked = localLikedItems.has(itemId);
    const newLikedItems = new Set(localLikedItems);
    const currentCount = localLikeCounts.get(itemId) || 0;

    if (isLiked) {
      newLikedItems.delete(itemId);
      setLocalLikeCounts(new Map(localLikeCounts.set(itemId, Math.max(0, currentCount - 1))));
    } else {
      newLikedItems.add(itemId);
      setLocalLikeCounts(new Map(localLikeCounts.set(itemId, currentCount + 1)));
    }
    
    setLocalLikedItems(newLikedItems);
    onLike?.(itemId);
  };

  const openLightbox = (index: number) => {
    const item = items[index];
    if (item.is_premium && !isSubscribed) {
      toast.info('Abonnez-vous pour voir ce contenu');
      return;
    }
    setSelectedIndex(index);
  };

  const closeLightbox = () => setSelectedIndex(null);

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedIndex]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Premium Grid Gallery */}
      <div className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-2",
        className
      )}>
        {items.map((item, index) => {
          const isLocked = item.is_premium && !isSubscribed;
          const isLiked = localLikedItems.has(item.id);
          const likeCount = localLikeCounts.get(item.id) || item.like_count;

          return (
            <div
              key={item.id}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-muted"
              onClick={() => openLightbox(index)}
            >
              {/* Thumbnail with lazy loading */}
              <img
                ref={handleImageRef}
                data-src={item.thumbnail_url || item.file_url}
                alt={item.title}
                className={cn(
                  "w-full h-full object-cover transition-all duration-500",
                  "group-hover:scale-110",
                  isLocked && "blur-xl scale-110",
                  loadedImages.has(item.id) ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setLoadedImages(prev => new Set(prev).add(item.id))}
                loading="lazy"
              />

              {/* Loading skeleton */}
              {!loadedImages.has(item.id) && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}

              {/* Lock overlay for premium content */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <div className="text-center text-white">
                    <Lock className="h-8 w-8 mx-auto mb-2 drop-shadow-lg" />
                    <span className="text-sm font-medium drop-shadow-lg">Premium</span>
                  </div>
                </div>
              )}

              {/* Video indicator */}
              {item.content_type === 'video' && !isLocked && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
                    <Play className="h-3 w-3 text-white fill-white" />
                    {item.duration && (
                      <span className="text-white text-xs font-medium">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Hover overlay with stats */}
              {!isLocked && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                  <div className="flex items-center gap-6 text-white">
                    <button
                      onClick={(e) => handleLike(e, item.id)}
                      className="flex items-center gap-1.5 hover:scale-110 transition-transform"
                    >
                      <Heart className={cn(
                        "h-6 w-6 drop-shadow-lg transition-colors",
                        isLiked && "fill-red-500 text-red-500"
                      )} />
                      <span className="font-semibold drop-shadow-lg">{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-6 w-6 drop-shadow-lg" />
                      <span className="font-semibold drop-shadow-lg">{item.view_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Premium Lightbox */}
      {selectedItem && selectedIndex !== null && (
        <PremiumLightbox
          item={selectedItem}
          isOpen={true}
          onClose={closeLightbox}
          onPrevious={selectedIndex > 0 ? goToPrevious : undefined}
          onNext={selectedIndex < items.length - 1 ? goToNext : undefined}
          isLiked={localLikedItems.has(selectedItem.id)}
          likeCount={localLikeCounts.get(selectedItem.id) || selectedItem.like_count}
          onLike={() => handleLike({ stopPropagation: () => {} } as React.MouseEvent, selectedItem.id)}
          creatorName={creatorName}
        />
      )}
    </>
  );
};

// Premium Lightbox Component
interface PremiumLightboxProps {
  item: GalleryItem;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  creatorName?: string;
}

const PremiumLightbox: React.FC<PremiumLightboxProps> = ({
  item,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  isLiked,
  likeCount,
  onLike,
  creatorName
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom on item change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [item.id]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  if (!isOpen) return null;

  return (
    <ProtectedMedia
      className="fixed inset-0 z-[9999] bg-black"
      watermarkText={creatorName}
      enableForensicWatermark={true}
      forensicOpacity={0.03}
    >
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className="flex items-center gap-2 text-white hover:scale-105 transition-transform"
            >
              <Heart className={cn(
                "h-7 w-7 transition-all",
                isLiked ? "fill-red-500 text-red-500 animate-scale-in" : "hover:text-red-400"
              )} />
              <span className="font-semibold text-lg">{likeCount}</span>
            </button>
            <div className="flex items-center gap-2 text-white/80">
              <Eye className="h-5 w-5" />
              <span>{item.view_count}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {item.content_type === 'video' && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        {onPrevious && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white hover:scale-110"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        {onNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white hover:scale-110"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Content */}
        <div 
          className="flex-1 flex items-center justify-center p-4"
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {item.content_type === 'video' ? (
            <div className="relative max-w-full max-h-full">
              <video
                ref={videoRef}
                src={item.file_url}
                poster={item.thumbnail_url}
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                muted={isMuted}
                playsInline
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              />
              
              {/* Play/Pause overlay for video */}
              {!isVideoPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  <div className="p-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all hover:scale-110">
                    <Play className="h-12 w-12 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img
              src={item.file_url}
              alt={item.title}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: scale > 1 ? 'grab' : 'zoom-in'
              }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </div>

        {/* Bottom info */}
        {(item.title || item.description) && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            {item.title && (
              <h3 className="text-white text-xl font-semibold mb-1">{item.title}</h3>
            )}
            {item.description && (
              <p className="text-white/70 text-sm line-clamp-2">{item.description}</p>
            )}
          </div>
        )}
      </div>
    </ProtectedMedia>
  );
};

export default PremiumGallery;
