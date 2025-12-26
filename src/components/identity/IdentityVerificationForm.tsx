import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Upload, 
  Camera, 
  CreditCard, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Shield,
  X
} from 'lucide-react';

interface IdentityVerificationFormProps {
  onComplete?: () => void;
}

type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

const IdentityVerificationForm: React.FC<IdentityVerificationFormProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('none');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  
  // File state
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Check existing verification status
  React.useEffect(() => {
    if (user) {
      checkVerificationStatus();
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatus(data.status as VerificationStatus);
        if (data.rejection_reason) {
          setRejectionReason(data.rejection_reason);
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !idFrontFile || !selfieFile || !fullName || !birthdate || !documentType) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload documents
      const idFrontUrl = await uploadFile(idFrontFile, 'id-front');
      const idBackUrl = idBackFile ? await uploadFile(idBackFile, 'id-back') : null;
      const selfieUrl = await uploadFile(selfieFile, 'selfie');

      // Create verification request
      const { error } = await supabase
        .from('identity_verifications')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          birthdate,
          document_type: documentType,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          selfie_with_id_url: selfieUrl,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatus('pending');
      toast.success('Votre demande de vérification a été soumise');
      onComplete?.();
    } catch (error: any) {
      console.error('Verification submission error:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileUploadBox = ({ 
    label, 
    icon: Icon, 
    file, 
    onFileChange, 
    required = true 
  }: { 
    label: string; 
    icon: React.ElementType; 
    file: File | null; 
    onFileChange: (file: File | null) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}`}
        onClick={() => document.getElementById(`file-${label}`)?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cliquez pour sélectionner un fichier
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou PDF (max. 10 Mo)
            </p>
          </div>
        )}
      </div>
      <input
        id={`file-${label}`}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > 10 * 1024 * 1024) {
            toast.error('Le fichier est trop volumineux (max. 10 Mo)');
            return;
          }
          onFileChange(file || null);
        }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Status cards for different states
  if (status === 'approved') {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
          <div>
            <h3 className="text-xl font-semibold text-green-500">Identité vérifiée</h3>
            <p className="text-muted-foreground mt-2">
              Votre identité a été vérifiée avec succès. Vous disposez du badge vérifié.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="py-8 text-center space-y-4">
          <Clock className="h-16 w-16 mx-auto text-amber-500 animate-pulse" />
          <div>
            <h3 className="text-xl font-semibold text-amber-500">Vérification en cours</h3>
            <p className="text-muted-foreground mt-2">
              Votre demande est en cours d'examen. Vous serez notifié une fois la vérification terminée.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Délai moyen : 24-48 heures
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'rejected') {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 space-y-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
            <div>
              <h3 className="text-xl font-semibold text-destructive">Vérification refusée</h3>
              <p className="text-muted-foreground mt-2">
                {rejectionReason || 'Votre demande de vérification a été refusée.'}
              </p>
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={() => setStatus('none')}
          >
            Soumettre une nouvelle demande
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Form for new verification
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Vérification d'identité
        </CardTitle>
        <CardDescription>
          Pour la sécurité de tous, nous devons vérifier votre identité.
          Vos documents sont stockés de manière sécurisée et ne seront utilisés que pour la vérification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet (comme sur le document) *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Date de naissance *</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type de document *</Label>
            <Select value={documentType} onValueChange={setDocumentType} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_card">Carte d'identité</SelectItem>
                <SelectItem value="passport">Passeport</SelectItem>
                <SelectItem value="driver_license">Permis de conduire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document uploads */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Documents d'identité
            </h4>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FileUploadBox
                label="Recto de la pièce d'identité"
                icon={CreditCard}
                file={idFrontFile}
                onFileChange={setIdFrontFile}
              />
              <FileUploadBox
                label="Verso de la pièce d'identité"
                icon={CreditCard}
                file={idBackFile}
                onFileChange={setIdBackFile}
                required={documentType === 'id_card'}
              />
            </div>
          </div>

          {/* Selfie upload */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Selfie de vérification
            </h4>
            <FileUploadBox
              label="Selfie avec votre pièce d'identité"
              icon={User}
              file={selfieFile}
              onFileChange={setSelfieFile}
            />
            <p className="text-sm text-muted-foreground">
              Prenez une photo de vous tenant votre pièce d'identité à côté de votre visage.
              Assurez-vous que les informations sur le document sont lisibles.
            </p>
          </div>

          {/* Legal notice */}
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Protection de vos données</p>
            <p>
              Vos documents d'identité sont chiffrés et stockés de manière sécurisée.
              Ils ne sont accessibles que par notre équipe de vérification et seront supprimés
              après validation de votre compte. Conformément au RGPD, vous pouvez demander
              la suppression de vos données à tout moment.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !idFrontFile || !selfieFile || !fullName || !birthdate || !documentType}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre ma demande'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IdentityVerificationForm;
