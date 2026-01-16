import React, { useState, useRef, useCallback } from 'react';
import { X, Download, RotateCcw, Sun, Contrast, Droplets, Sparkles, Palette, CloudFog, Flame, Snowflake, Moon, Heart, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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

  const getFilterStyle = useCallback((): React.CSSProperties => {
    const baseFilter = FILTERS.find(f => f.id === selectedFilter)?.style.filter || '';
    const customFilter = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100}) blur(${blur}px)`;
    return {
      filter: baseFilter ? `${baseFilter} ${customFilter}` : customFilter,
      transition: 'filter 0.3s ease',
    };
  }, [selectedFilter, brightness, contrast, saturation, blur]);

  const handleReset = () => {
    setSelectedFilter('normal');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
  };

  const handleDownload = async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Appliquer les filtres
    ctx.filter = getFilterStyle().filter || 'none';
    ctx.drawImage(img, 0, 0);

    // Télécharger
    const link = document.createElement('a');
    link.download = `photo-edited-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Photo téléchargée avec succès!');
  };

  const handleSave = async () => {
    if (!imageRef.current || !canvasRef.current || !onSave) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.filter = getFilterStyle().filter || 'none';
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    toast.success('Photo sauvegardée!');
    onClose();
  };

  // Sauvegarder sur le serveur - Upload direct vers Storage (plus rapide)
  const handleServerSave = async () => {
    if (!imageRef.current || !canvasRef.current || !contentId) {
      toast.error('Impossible de sauvegarder: données manquantes');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.filter = getFilterStyle().filter || 'none';
    ctx.drawImage(img, 0, 0);

    setIsSaving(true);

    try {
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

      // Convertir le canvas en Blob (beaucoup plus rapide que base64)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Impossible de créer le blob'));
        }, 'image/png', 0.9);
      });

      // Upload direct vers Storage
      const timestamp = Date.now();
      const fileName = `edited_${timestamp}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('content')
        .getPublicUrl(filePath);

      const newFileUrl = urlData.publicUrl;

      // Supprimer l'ancienne image du storage
      const oldUrl = content.file_url;
      if (oldUrl) {
        const oldPathMatch = oldUrl.match(/\/storage\/v1\/object\/public\/content\/(.+)/);
        if (oldPathMatch && oldPathMatch[1]) {
          const oldPath = decodeURIComponent(oldPathMatch[1]);
          console.log('Suppression de l\'ancienne image:', oldPath);
          await supabase.storage.from('content').remove([oldPath]);
        }
      }

      // Mettre à jour le contenu avec la nouvelle URL
      const { error: updateError } = await supabase
        .from('content')
        .update({ 
          file_url: newFileUrl,
          thumbnail_url: newFileUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (updateError) throw updateError;

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
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-white font-semibold text-lg">Éditer la photo</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-white hover:bg-white/10">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="text-white hover:bg-white/10">
            <Download className="w-4 h-4 mr-1" />
            Télécharger
          </Button>
          {contentId && (
            <Button 
              size="sm" 
              onClick={handleServerSave} 
              disabled={isSaving || !imageLoaded}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Sauvegarder
                </>
              )}
            </Button>
          )}
          {onSave && !contentId && (
            <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90">
              Sauvegarder
            </Button>
          )}
        </div>
      </div>

      {/* Zone image principale */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/50">
        {(urlLoading || (!imageLoaded && !imageError)) && (
          <div className="text-white/70 flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Chargement...</span>
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
            crossOrigin="anonymous"
            style={{
              ...getFilterStyle(),
              display: imageLoaded && !urlLoading ? 'block' : 'none',
            }}
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Contrôles des ajustements */}
      <div className="p-4 border-t border-white/10 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-white/70 text-sm flex items-center gap-2">
              <Sun className="w-4 h-4" /> Luminosité
            </label>
            <Slider
              value={[brightness]}
              onValueChange={([v]) => setBrightness(v)}
              min={0}
              max={200}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-white/70 text-sm flex items-center gap-2">
              <Contrast className="w-4 h-4" /> Contraste
            </label>
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={0}
              max={200}
              step={1}
              className="w-full"
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
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-white/70 text-sm flex items-center gap-2">
              <CloudFog className="w-4 h-4" /> Flou
            </label>
            <Slider
              value={[blur]}
              onValueChange={([v]) => setBlur(v)}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Filtres Instagram-style */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                selectedFilter === filter.id
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div
                className="w-16 h-16 rounded-lg overflow-hidden bg-cover bg-center bg-muted"
                style={{
                  backgroundImage: effectiveUrl ? `url(${effectiveUrl})` : 'none',
                  ...filter.style,
                }}
              />
              <span className="text-white/80 text-xs font-medium">{filter.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
