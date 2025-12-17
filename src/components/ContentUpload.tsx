import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Upload, Image, Video, X, Euro, Shield, AlertTriangle, Bug } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContentUpload } from '@/hooks/useContentUpload';
import { useRateLimitServer } from '@/hooks/useRateLimitServer';
import { useVirusScan } from '@/hooks/useVirusScan';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { contentUploadSchema } from '@/lib/validations';
import { validateFile } from '@/lib/fileValidation';
import { z } from 'zod';

interface ContentUploadProps {
  onUploadComplete?: () => void;
}

const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const { uploadContent, uploading, progress } = useContentUpload();
  const { checkRateLimit } = useRateLimitServer();
  const { scanFile, scanning } = useVirusScan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPremium: false,
    isPreview: false
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [virusScanStatus, setVirusScanStatus] = useState<'idle' | 'scanning' | 'clean' | 'infected' | 'skipped'>('idle');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setValidationStatus('idle');
    setVirusScanStatus('idle');

    try {
      // Validation sécurisée complète du fichier
      const validationResult = await validateFile(file);

      if (!validationResult.isValid) {
        toast.error(validationResult.error || 'Fichier non valide');
        setValidationStatus('error');
        setIsValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setValidationStatus('success');
      setIsValidating(false);

      // Scan antivirus avec MetaDefender
      setVirusScanStatus('scanning');
      toast.info('Scan antivirus en cours...', { duration: 10000 });
      
      const scanResult = await scanFile(file);
      
      if (!scanResult.isClean && !scanResult.skipped) {
        toast.error('Fichier potentiellement dangereux détecté!', {
          description: scanResult.threatFound || 'Ce fichier a été bloqué pour des raisons de sécurité'
        });
        setVirusScanStatus('infected');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (scanResult.skipped) {
        setVirusScanStatus('skipped');
        toast.warning('Scan antivirus ignoré', {
          description: scanResult.message || 'Le fichier sera accepté mais non scanné'
        });
      } else {
        setVirusScanStatus('clean');
        toast.success('Fichier sécurisé!', {
          description: 'Aucune menace détectée par l\'antivirus'
        });
      }

      setSelectedFile(file);

      // Créer un aperçu
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

    } catch (error) {
      console.error('Erreur de validation:', error);
      toast.error('Erreur lors de la validation du fichier');
      setValidationStatus('error');
      setVirusScanStatus('idle');
    }
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
        isPreview: formData.isPreview,
        price: 0,
        file: selectedFile
      }, creatorData.id, user.id);

      // Reset form
      setFormData({
        title: '',
        description: '',
        isPremium: false,
        isPreview: false
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
    setValidationStatus('idle');
    setVirusScanStatus('idle');
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
            <Label className="flex items-center gap-2 flex-wrap">
              Fichier média
              {validationStatus === 'success' && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  <Shield className="h-3 w-3" />
                  Vérifié
                </span>
              )}
              {virusScanStatus === 'clean' && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  <Bug className="h-3 w-3" />
                  Sans virus
                </span>
              )}
              {virusScanStatus === 'skipped' && (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  Scan ignoré
                </span>
              )}
            </Label>
            
            {/* Info sur la sécurité et le filigrane */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 space-y-2">
              <p className="text-sm text-primary flex items-center gap-2">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>Validation sécurisée :</strong> Chaque fichier est analysé pour détecter les contenus malveillants (magic bytes, type MIME, extension).
                </span>
              </p>
              <p className="text-sm text-primary flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span>
                  <strong>Protection automatique :</strong> Un filigrane avec votre nom sera automatiquement ajouté aux images.
                </span>
              </p>
              <p className="text-sm text-primary flex items-center gap-2">
                <Bug className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>Scan antivirus :</strong> Chaque fichier est scanné via MetaDefender Cloud pour détecter les menaces.
                </span>
              </p>
            </div>
            
            {(isValidating || virusScanStatus === 'scanning') && (
              <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center bg-primary/5">
                <div className="animate-spin h-12 w-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-lg font-medium mb-2">
                  {isValidating ? 'Validation du fichier en cours...' : 'Scan antivirus en cours...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isValidating 
                    ? 'Vérification du type, de l\'intégrité et de la sécurité'
                    : 'Analyse du fichier pour détecter d\'éventuelles menaces'
                  }
                </p>
              </div>
            )}

            {!selectedFile && !isValidating && virusScanStatus !== 'scanning' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Cliquez pour sélectionner un fichier</p>
                <p className="text-sm text-muted-foreground">
                  Images (JPG, PNG, WebP, GIF) ou Vidéos (MP4, WebM, MOV)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 20MB pour images, 100MB pour vidéos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : selectedFile && (
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
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  isPremium: checked,
                  isPreview: checked ? prev.isPreview : false 
                }))}
              />
            </div>
            
            {/* Preview Toggle - Only show when content is premium */}
            {formData.isPremium && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="preview" className="flex items-center gap-2">
                    👁️ Photo d'aperçu
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Visible par tous (non-abonnés voient une version floutée)
                  </p>
                </div>
                <Switch
                  id="preview"
                  checked={formData.isPreview}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPreview: checked }))}
                />
              </div>
            )}
            
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              💡 {formData.isPremium 
                ? formData.isPreview 
                  ? "Ce contenu sera visible par tous mais flouté pour les non-abonnés." 
                  : "Seuls vos abonnés pourront voir ce contenu."
                : "Tout le monde pourra voir ce contenu gratuitement."
              }
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
            disabled={uploading || scanning || !selectedFile || !formData.title.trim() || virusScanStatus === 'infected'}
            className="w-full"
            variant="premium"
          >
            {uploading ? 'Upload en cours...' : scanning ? 'Scan en cours...' : 'Publier le contenu'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContentUpload;