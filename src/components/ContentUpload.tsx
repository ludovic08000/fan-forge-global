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
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { contentUploadSchema } from '@/lib/validations';
import { z } from 'zod';

interface ContentUploadProps {
  onUploadComplete?: () => void;
}

const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const { uploadContent, uploading, progress } = useContentUpload();
  const { checkRateLimit } = useRateLimitServer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPremium: false
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

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Vérifier le rate limit
    const isAllowed = await checkRateLimit('upload');
    if (!isAllowed) return;

    try {
      // Valider avec Zod
      const validatedData = contentUploadSchema.parse({
        title: formData.title,
        description: formData.description,
        isPremium: formData.isPremium,
        price: 0,
      });
      
      if (!validatedData.title.trim()) {
        toast.error('Veuillez entrer un titre');
        return;
      }
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
        title: validatedData.title,
        description: validatedData.description || undefined,
        isPremium: validatedData.isPremium,
        price: 0,
        file: selectedFile
      }, creatorData.id, user.id);

      // Reset form
      setFormData({
        title: '',
        description: '',
        isPremium: false
      });
      setSelectedFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.();

    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          toast.error(err.message);
        });
      } else {
        console.error('Upload error:', error);
      }
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
            
            {/* Info sur le filigrane */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-primary flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span>
                  <strong>Protection automatique :</strong> Un filigrane avec votre nom sera automatiquement ajouté aux images pour protéger votre contenu.
                </span>
              </p>
            </div>
            
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
                  Réservé aux abonnés payants uniquement
                </p>
              </div>
              <Switch
                id="premium"
                checked={formData.isPremium}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPremium: checked }))}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              💡 Si activé, seuls vos abonnés pourront voir ce contenu. Sinon, tout le monde peut le voir gratuitement.
            </p>
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