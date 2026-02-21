/**
 * Composant pour envoyer des médias payants dans le chat (créateurs uniquement)
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Image, Video, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PaidMediaUploadProps {
  liveStreamId: string;
  creatorId: string;
  onMediaSent: (mediaData: {
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    price: number;
  }) => void;
}

export const PaidMediaUpload = ({ liveStreamId, creatorId, onMediaSent }: PaidMediaUploadProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error('Seules les images et vidéos sont autorisées');
      return;
    }

    // Limite de taille (1GB pour les vidéos, 10MB pour les images)
    const maxSize = isVideo ? 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Fichier trop volumineux (max ${isVideo ? '1 Go' : '10 Mo'})`);
      return;
    }

    setSelectedFile(file);
    
    // Créer preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !price || parseFloat(price) <= 0) {
      toast.error('Veuillez sélectionner un fichier et définir un prix');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setUploading(true);
    try {
      const isVideo = selectedFile.type.startsWith('video/');
      const fileExt = selectedFile.name.split('.').pop();
      // Utiliser l'ID utilisateur comme premier dossier (requis par la policy RLS)
      // puis l'ID du live stream pour organiser
      const fileName = `${user.id}/live-${liveStreamId}/${Date.now()}.${fileExt}`;

      console.log('[PaidMediaUpload] Uploading file:', fileName);

      // Upload vers le bucket content
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('[PaidMediaUpload] Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[PaidMediaUpload] Upload success:', uploadData);

      // Obtenir l'URL signée (valide 7 jours)
      const { data: signedData } = await supabase.storage
        .from('content')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      if (!signedData?.signedUrl) throw new Error('Erreur création URL');

      // Créer une miniature pour les vidéos (on utilise la même URL pour l'instant)
      const thumbnailUrl = isVideo ? undefined : signedData.signedUrl;

      onMediaSent({
        type: isVideo ? 'video' : 'image',
        url: signedData.signedUrl,
        thumbnailUrl,
        price: parseFloat(price),
      });

      toast.success('Média envoyé avec succès');
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'envoi du média');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Image className="h-4 w-4" />
          Média payant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer un média payant</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Zone de sélection de fichier */}
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="relative">
                {selectedFile?.type.startsWith('video/') ? (
                  <video 
                    src={previewUrl} 
                    className="max-h-48 mx-auto rounded"
                    controls
                  />
                ) : (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour sélectionner une image ou vidéo
                </p>
                <p className="text-xs text-muted-foreground">
                  Images: max 10Mo • Vidéos: max 1Go
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Prix */}
          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              type="number"
              min="0.50"
              step="0.50"
              placeholder="Ex: 5.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: 0.50€
            </p>
          </div>

          {/* Bouton d'envoi */}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !price || parseFloat(price) < 0.5 || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Envoyer ({price ? `${price}€` : '0€'})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
