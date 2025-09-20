import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Upload, Image, Video, X, Euro } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContentUpload } from '@/hooks/useContentUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentUploadProps {
  onUploadComplete?: () => void;
}

const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const { uploadContent, uploading, progress } = useContentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPremium: false,
    price: 0
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté. Utilisez JPG, PNG, WebP ou MP4.');
      return;
    }

    // Vérifier la taille (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fichier trop volumineux. Taille maximum : 50MB.');
      return;
    }

    setSelectedFile(file);

    // Créer un aperçu
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      // Récupérer l'ID du créateur
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creatorError || !creatorData) {
        toast.error('Vous devez être créateur pour uploader du contenu');
        return;
      }

      await uploadContent({
        title: formData.title,
        description: formData.description || undefined,
        isPremium: formData.isPremium,
        price: formData.isPremium ? formData.price : undefined,
        file: selectedFile
      }, creatorData.id, user.id);

      // Reset form
      setFormData({
        title: '',
        description: '',
        isPremium: false,
        price: 0
      });
      setSelectedFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.();

    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5 text-primary" />
          <span>Nouveau Contenu</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <Label>Fichier média</Label>
            
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Cliquez pour sélectionner un fichier</p>
                <p className="text-sm text-muted-foreground">
                  Images (JPG, PNG, WebP) ou Vidéos (MP4, WebM) - Max 50MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {isVideo ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <Image className="h-5 w-5 text-primary" />
                      )}
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Preview */}
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    {isVideo ? (
                      <video 
                        src={previewUrl} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Titre de votre contenu"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre contenu..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Premium Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="premium">Contenu Premium</Label>
                <p className="text-sm text-muted-foreground">
                  Réservé aux abonnés payants
                </p>
              </div>
              <Switch
                id="premium"
                checked={formData.isPremium}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPremium: checked }))}
              />
            </div>

            {/* Price (si premium) */}
            {formData.isPremium && (
              <div className="space-y-2">
                <Label htmlFor="price">Prix (optionnel)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Prix supplémentaire pour ce contenu (en plus de l'abonnement)
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={uploading || !selectedFile || !formData.title.trim()}
            className="w-full"
            variant="premium"
          >
            {uploading ? 'Upload en cours...' : 'Publier le contenu'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContentUpload;