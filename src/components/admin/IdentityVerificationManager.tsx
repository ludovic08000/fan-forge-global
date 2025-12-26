import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  CreditCard,
  Eye,
  Shield,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface IdentityVerification {
  id: string;
  user_id: string;
  full_name: string;
  birthdate: string;
  document_type: string;
  id_front_url: string;
  id_back_url: string | null;
  selfie_with_id_url: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

const IdentityVerificationManager: React.FC = () => {
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<IdentityVerification | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('identity_verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Erreur lors du chargement des vérifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    if (imageUrls[path]) return imageUrls[path];

    const { data, error } = await supabase.storage
      .from('identity-documents')
      .createSignedUrl(path, 3600); // 1 hour

    if (error) {
      console.error('Error getting signed URL:', error);
      return '';
    }

    setImageUrls(prev => ({ ...prev, [path]: data.signedUrl }));
    return data.signedUrl;
  };

  const openReviewDialog = async (verification: IdentityVerification) => {
    setSelectedVerification(verification);
    setRejectionReason('');
    
    // Pre-load image URLs
    await Promise.all([
      getSignedUrl(verification.id_front_url),
      verification.id_back_url ? getSignedUrl(verification.id_back_url) : Promise.resolve(''),
      getSignedUrl(verification.selfie_with_id_url)
    ]);
    
    setIsReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update verification status
      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedVerification.id);

      if (verificationError) throw verificationError;

      // Update profile to mark as verified
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_identity_verified: true })
        .eq('user_id', selectedVerification.user_id);

      if (profileError) throw profileError;

      toast.success('Vérification approuvée');
      setIsReviewDialogOpen(false);
      fetchVerifications();
    } catch (error: any) {
      console.error('Error approving verification:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('Veuillez indiquer la raison du refus');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      toast.success('Vérification refusée');
      setIsReviewDialogOpen(false);
      fetchVerifications();
    } catch (error: any) {
      console.error('Error rejecting verification:', error);
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-destructive border-destructive"><XCircle className="h-3 w-3 mr-1" /> Refusé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'id_card': return "Carte d'identité";
      case 'passport': return 'Passeport';
      case 'driver_license': return 'Permis de conduire';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Vérifications d'identité
          </h2>
          <p className="text-muted-foreground">
            Gérez les demandes de vérification d'identité
          </p>
        </div>
        <Button variant="outline" onClick={fetchVerifications}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'pending' && <Clock className="h-4 w-4 mr-1" />}
            {f === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
            {f === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvées' : f === 'rejected' ? 'Refusées' : 'Toutes'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : verifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune vérification {filter !== 'all' ? `${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'refusée'}` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {verifications.map((verification) => (
            <Card key={verification.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-full p-3">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{verification.full_name}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(verification.birthdate), 'dd/MM/yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {getDocumentTypeName(verification.document_type)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Soumis le {format(new Date(verification.submitted_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(verification.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewDialog(verification)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Examiner
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Examen de la vérification d'identité</DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* User info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium">{selectedVerification.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de naissance</p>
                  <p className="font-medium">{format(new Date(selectedVerification.birthdate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de document</p>
                  <p className="font-medium">{getDocumentTypeName(selectedVerification.document_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedVerification.status)}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-medium">Documents soumis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Recto pièce d'identité</p>
                    {imageUrls[selectedVerification.id_front_url] && (
                      <img 
                        src={imageUrls[selectedVerification.id_front_url]} 
                        alt="ID Front" 
                        className="w-full rounded-lg border"
                      />
                    )}
                  </div>
                  {selectedVerification.id_back_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Verso pièce d'identité</p>
                      {imageUrls[selectedVerification.id_back_url] && (
                        <img 
                          src={imageUrls[selectedVerification.id_back_url]} 
                          alt="ID Back" 
                          className="w-full rounded-lg border"
                        />
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selfie avec pièce d'identité</p>
                    {imageUrls[selectedVerification.selfie_with_id_url] && (
                      <img 
                        src={imageUrls[selectedVerification.selfie_with_id_url]} 
                        alt="Selfie" 
                        className="w-full rounded-lg border"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
                <h4 className="font-medium flex items-center gap-2 text-amber-600 mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  Points à vérifier
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>☐ Le nom sur le document correspond au nom déclaré</li>
                  <li>☐ La date de naissance correspond et la personne a 18 ans ou plus</li>
                  <li>☐ Le document est valide et non expiré</li>
                  <li>☐ Le selfie montre clairement le visage et le document</li>
                  <li>☐ La personne sur le selfie correspond à la photo du document</li>
                </ul>
              </div>

              {/* Rejection reason for pending verifications */}
              {selectedVerification.status === 'pending' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Raison du refus (si applicable)</p>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indiquez la raison du refus..."
                  />
                </div>
              )}

              {/* Existing rejection reason */}
              {selectedVerification.rejection_reason && (
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
                  <p className="text-sm font-medium text-destructive">Raison du refus</p>
                  <p className="text-sm mt-1">{selectedVerification.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Fermer
            </Button>
            {selectedVerification?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Refuser
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approuver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdentityVerificationManager;
