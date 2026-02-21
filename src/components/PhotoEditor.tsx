import React, { useState, useRef, useCallback } from 'react';
import { X, Download, RotateCcw, Sun, Contrast, Droplets, Sparkles, Palette, CloudFog, Flame, Snowflake, Moon, Heart, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RotaryKnob from '@/components/ui/rotary-knob';
import { toast } from 'sonner';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Filter {
  id: string;
  name: string;
  icon: React.ReactNode;
  style: React.CSSProperties;
}

interface PhotoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  contentId?: string; // ID du contenu pour la sauvegarde serveur
  onSave?: (editedImageUrl: string) => void;
  onServerSave?: () => void; // Callback après sauvegarde serveur
}

const FILTERS: Filter[] = [
  { id: 'normal', name: 'Normal', icon: <Sparkles className="w-4 h-4" />, style: {} },
  { id: 'clarendon', name: 'Clarendon', icon: <Sun className="w-4 h-4" />, style: { filter: 'contrast(1.2) saturate(1.35)' } },
  { id: 'gingham', name: 'Gingham', icon: <CloudFog className="w-4 h-4" />, style: { filter: 'brightness(1.05) hue-rotate(-10deg)' } },
  { id: 'moon', name: 'Moon', icon: <Moon className="w-4 h-4" />, style: { filter: 'grayscale(1) contrast(1.1) brightness(1.1)' } },
  { id: 'lark', name: 'Lark', icon: <Droplets className="w-4 h-4" />, style: { filter: 'contrast(0.9) saturate(1.5) brightness(1.1)' } },
  { id: 'reyes', name: 'Reyes', icon: <Palette className="w-4 h-4" />, style: { filter: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' } },
  { id: 'juno', name: 'Juno', icon: <Flame className="w-4 h-4" />, style: { filter: 'saturate(1.4) contrast(1.15) brightness(1.05) hue-rotate(-10deg)' } },
  { id: 'slumber', name: 'Slumber', icon: <Snowflake className="w-4 h-4" />, style: { filter: 'saturate(0.66) brightness(1.05) sepia(0.1)' } },
  { id: 'crema', name: 'Crema', icon: <Heart className="w-4 h-4" />, style: { filter: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9) hue-rotate(-2deg)' } },
  { id: 'ludwig', name: 'Ludwig', icon: <Contrast className="w-4 h-4" />, style: { filter: 'saturate(1.5) contrast(1.05) brightness(1.05)' } },
  { id: 'aden', name: 'Aden', icon: <Sun className="w-4 h-4" />, style: { filter: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' } },
  { id: 'perpetua', name: 'Perpetua', icon: <Sparkles className="w-4 h-4" />, style: { filter: 'contrast(1.1) brightness(1.25) saturate(1.1)' } },
];

const PhotoEditor: React.FC<PhotoEditorProps> = ({
  isOpen,
  onClose,
  imageUrl,
  contentId,
  onSave,
  onServerSave,
}) => {
  const queryClient = useQueryClient();
  
  // Utiliser l'URL signée pour accéder à l'image
  const { signedUrl, loading: urlLoading } = useSignedUrl(imageUrl, { enabled: isOpen && !!imageUrl });
  
  const [selectedFilter, setSelectedFilter] = useState<string>('normal');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [blur, setBlur] = useState<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // L'URL effective à utiliser (signée ou originale)
  const effectiveUrl = signedUrl || imageUrl;

  // Reset states when opening with new image
  React.useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setImageError(false);
      setSelectedFilter('normal');
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setBlur(0);
      setIsSaving(false);
    }
  }, [isOpen, imageUrl]);

  const getFilterString = useCallback((): string => {
    const baseFilter = FILTERS.find(f => f.id === selectedFilter)?.style.filter || '';
    const customFilter = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100}) blur(${blur}px)`;
    return baseFilter ? `${baseFilter} ${customFilter}` : customFilter;
  }, [selectedFilter, brightness, contrast, saturation, blur]);

  const getFilterStyle = useCallback((): React.CSSProperties => {
    return {
      filter: getFilterString(),
      transition: 'filter 0.3s ease',
    };
  }, [getFilterString]);


  const handleReset = () => {
    setSelectedFilter('normal');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
  };

  // Fetch image via same-origin proxy to avoid tainted canvas / CSP issues
  const fetchImageViaProxy = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Get auth token for the edge function call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Non authentifié');

    // Direct fetch to edge function (returns raw image bytes)
    const response = await fetch(`https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/proxy-r2-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath: imageUrl }),
    });

    if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
    
    const blob = await response.blob();
    const bmp = await createImageBitmap(blob);

    canvas.width = bmp.width;
    canvas.height = bmp.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply CSS filters via canvas context
    ctx.filter = getFilterString();
    ctx.drawImage(bmp, 0, 0);
    ctx.filter = 'none';
    bmp.close();

    return canvas;
  }, [imageUrl, getFilterString]);

  const handleDownload = async () => {
    if (!canvasRef.current || !imageLoaded) return;

    try {
      const canvas = await fetchImageViaProxy();
      if (!canvas) throw new Error('Canvas draw failed');

      const link = document.createElement('a');
      link.download = `photo-edited-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Photo téléchargée avec succès!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current || !onSave || !imageLoaded) return;

    try {
      const canvas = await fetchImageViaProxy();
      if (!canvas) throw new Error('Canvas draw failed');

      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      toast.success('Photo sauvegardée!');
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Sauvegarder sur le serveur - Upload vers R2 via presigned URL
  const handleServerSave = async () => {
    if (!canvasRef.current || !contentId || !imageLoaded) {
      toast.error('Impossible de sauvegarder: données manquantes');
      return;
    }

    const canvas = canvasRef.current;
    setIsSaving(true);

    try {
      // Fetch image via same-origin proxy to avoid tainted canvas
      const resultCanvas = await fetchImageViaProxy();
      if (!resultCanvas) throw new Error('Canvas draw failed');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Non authentifié');
      }

      // Vérifier que l'utilisateur est le propriétaire du contenu
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('id, creator_id, file_url')
        .eq('id', contentId)
        .single();

      if (contentError || !content) {
        throw new Error('Contenu non trouvé');
      }

      // Vérifier que l'utilisateur est le créateur
      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', content.creator_id)
        .single();

      if (creatorError || !creator) {
        throw new Error('Non autorisé à modifier ce contenu');
      }

      // Convertir le canvas en Blob
      const canvasBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Impossible de créer le blob'));
        }, 'image/png', 0.9);
      });
      console.log('[PhotoEditor] Step 8: Canvas blob size:', canvasBlob.size);

      // Upload vers R2 via presigned URL (comme le reste de la plateforme)
      const fileName = `edited_${Date.now()}.png`;
      console.log('[PhotoEditor] Step 9: Requesting R2 upload URL...');
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('r2-upload-url', {
        body: { fileName, contentType: 'image/png', fileSize: canvasBlob.size },
      });

      if (uploadError || !uploadData?.uploadUrl) {
        console.error('[PhotoEditor] R2 URL error:', uploadError, uploadData);
        throw new Error(uploadData?.error || uploadError?.message || 'Impossible d\'obtenir l\'URL d\'upload');
      }

      // PUT direct vers R2
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: canvasBlob,
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text().catch(() => '');
        console.error('[PhotoEditor] R2 PUT failed:', uploadResponse.status, errText);
        throw new Error(`Upload échoué (HTTP ${uploadResponse.status})`);
      }

      const newFilePath = uploadData.filePath;

      // Supprimer l'ancien fichier R2
      const oldPath = content.file_url;
      if (oldPath) {
        supabase.functions.invoke('delete-r2-file', {
          body: { filePath: oldPath },
        }).catch(err => console.warn('Cleanup ancien fichier (non-critique):', err));
      }

      // Mettre à jour le contenu avec le nouveau filePath R2
      const { error: updateError } = await supabase
        .from('content')
        .update({ 
          file_url: newFilePath,
          thumbnail_url: newFilePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (updateError) throw updateError;

      // Pré-remplir le cache R2 pour affichage instantané
      if (uploadData.viewUrl && uploadData.viewExpiresAt) {
        const { prefillR2UrlCache } = await import('@/hooks/useSecureR2Url');
        prefillR2UrlCache(newFilePath, uploadData.viewUrl, uploadData.viewExpiresAt);
      }

      // Invalider le cache React Query pour rafraîchir la galerie
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['my-content'] });
      queryClient.invalidateQueries({ queryKey: ['creator-content'] });

      toast.success('Photo sauvegardée!');
      onServerSave?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving to server:', error);
      toast.error(`Erreur: ${error.message || 'Impossible de sauvegarder'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-black via-black/95 to-black flex flex-col animate-in fade-in duration-300">
      {/* Header - Glassmorphism */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] backdrop-blur-xl bg-white/[0.03]">
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-300 group"
        >
          <X className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>
        <h2 className="text-white/90 font-semibold text-base tracking-wide uppercase" style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '0.1em' }}>
          Éditeur Photo
        </h2>
        <div className="flex gap-2">
          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all duration-300 hover:bg-white/10 border border-white/[0.06] hover:border-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/80 text-xs font-medium transition-all duration-300 bg-white/[0.08] hover:bg-white/15 border border-white/[0.1] hover:border-white/25 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger
          </button>
          {/* Server Save Button - Premium Gradient */}
          {contentId && (
            <button
              onClick={handleServerSave}
              disabled={isSaving || !imageLoaded}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all duration-300 bg-gradient-to-r from-primary via-primary/90 to-primary/70 hover:from-primary hover:via-primary hover:to-primary/80 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] border border-primary/30 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Sauvegarder
                </>
              )}
            </button>
          )}
          {onSave && !contentId && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all duration-300 bg-gradient-to-r from-primary via-primary/90 to-primary/70 hover:from-primary hover:via-primary hover:to-primary/80 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] border border-primary/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              Sauvegarder
            </button>
          )}
        </div>
      </div>

      {/* Zone image principale */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Ambient glow behind image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[60%] h-[60%] rounded-full bg-primary/[0.04] blur-[100px]" />
        </div>
        {(urlLoading || (!imageLoaded && !imageError)) && (
          <div className="text-white/70 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-white/50">Chargement...</span>
          </div>
        )}
        {imageError && !urlLoading && (
          <div className="text-red-400 flex flex-col items-center gap-2">
            <X className="w-12 h-12" />
            <span>Impossible de charger l'image</span>
            <span className="text-xs text-white/50">Vérifiez que le fichier est accessible</span>
          </div>
        )}
        {effectiveUrl && (
          <img
            ref={imageRef}
            src={effectiveUrl}
            alt="Photo à éditer"
            style={{
              ...getFilterStyle(),
              display: imageLoaded && !urlLoading ? 'block' : 'none',
            }}
            className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08]"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Contrôles - Premium Rotary Knobs */}
      <div className="px-5 py-4 border-t border-white/[0.06] backdrop-blur-xl bg-white/[0.02]">
        <div className="flex justify-center gap-6 md:gap-10">
          <RotaryKnob
            value={brightness}
            min={0}
            max={200}
            step={1}
            onChange={setBrightness}
            label="Luminosité"
            icon={<Sun className="w-3 h-3 text-amber-400" />}
            color="#f59e0b"
          />
          <RotaryKnob
            value={contrast}
            min={0}
            max={200}
            step={1}
            onChange={setContrast}
            label="Contraste"
            icon={<Contrast className="w-3 h-3 text-blue-400" />}
            color="#60a5fa"
          />
          <RotaryKnob
            value={saturation}
            min={0}
            max={200}
            step={1}
            onChange={setSaturation}
            label="Saturation"
            icon={<Droplets className="w-3 h-3 text-cyan-400" />}
            color="#22d3ee"
          />
          <RotaryKnob
            value={blur}
            min={0}
            max={10}
            step={0.1}
            onChange={setBlur}
            label="Flou"
            icon={<CloudFog className="w-3 h-3 text-purple-400" />}
            color="#a78bfa"
          />
        </div>
      </div>

      {/* Filtres - Premium horizontal scroll */}
      <div className="px-5 py-4 border-t border-white/[0.06] backdrop-blur-xl bg-white/[0.02]">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-300 group ${
                selectedFilter === filter.id
                  ? 'bg-primary/15 ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.2)] scale-[1.05]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1]'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-xl overflow-hidden bg-cover bg-center transition-all duration-300 ${
                  selectedFilter === filter.id ? 'ring-1 ring-primary/40' : 'ring-1 ring-white/[0.06] group-hover:ring-white/[0.15]'
                }`}
                style={{
                  backgroundImage: effectiveUrl ? `url(${effectiveUrl})` : 'none',
                  ...filter.style,
                }}
              />
              <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                selectedFilter === filter.id ? 'text-primary' : 'text-white/40 group-hover:text-white/70'
              }`}>{filter.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
