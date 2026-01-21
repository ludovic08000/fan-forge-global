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
  Eye,
  Brain,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Image,
  Video,
  FileText,
  ShieldCheck,
  ShieldX
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AIModerationItem {
  id: string;
  content_id: string | null;
  message_id: string | null;
  user_id: string;
  content_type: string;
  file_url: string;
  thumbnail_url: string | null;
  ai_category: string | null;
  ai_confidence: number;
  ai_recommendation: string;
  ai_reason: string | null;
  ai_flags: Record<string, boolean>;
  ai_issues: string[];
  ai_model: string | null;
  analyzed_at: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  action_taken: string | null;
  created_at: string;
}

export const AIModerationManager: React.FC = () => {
  const [items, setItems] = useState<AIModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AIModerationItem | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ai_moderation_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Cast the data to match our interface
      const typedData = (data || []).map((item: any) => ({
        ...item,
        ai_flags: item.ai_flags || {},
        ai_issues: item.ai_issues || []
      })) as AIModerationItem[];
      
      setItems(typedData);
    } catch (error) {
      console.error('Error fetching moderation items:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const getSignedUrl = async (url: string): Promise<string> => {
    // If it's already a full URL, return it
    if (url.startsWith('http')) return url;
    
    // Otherwise get a signed URL from storage
    const { data, error } = await supabase.storage
      .from('content')
      .createSignedUrl(url, 3600);

    if (error) {
      console.error('Error getting signed URL:', error);
      return '';
    }
    return data.signedUrl;
  };

  const openReviewDialog = async (item: AIModerationItem) => {
    setSelectedItem(item);
    setAdminNotes(item.admin_notes || '');
    
    // Get signed URL for the content
    const url = await getSignedUrl(item.file_url);
    setSignedUrl(url);
    
    setIsReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_moderation_queue')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: adminNotes,
          action_taken: 'approved'
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Contenu approuvé');
      setIsReviewDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (deleteContent: boolean = false) => {
    if (!selectedItem) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update moderation queue
      const { error } = await supabase
        .from('ai_moderation_queue')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: adminNotes,
          action_taken: deleteContent ? 'deleted' : 'rejected'
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Optionally delete the content
      if (deleteContent && selectedItem.content_id) {
        await supabase
          .from('content')
          .update({ status: 'archived' })
          .eq('id', selectedItem.content_id);
      }

      toast.success(deleteContent ? 'Contenu supprimé' : 'Contenu rejeté');
      setIsReviewDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error(error.message || 'Erreur lors du rejet');
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
        return <Badge variant="outline" className="text-destructive border-destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return <Badge className="bg-green-500/20 text-green-500">Auto-approuvable</Badge>;
      case 'manual_review':
        return <Badge className="bg-amber-500/20 text-amber-500">Revue requise</Badge>;
      case 'reject':
        return <Badge className="bg-red-500/20 text-red-500">À rejeter</Badge>;
      default:
        return <Badge variant="outline">{recommendation}</Badge>;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'safe':
        return 'text-green-500';
      case 'adult':
        return 'text-blue-500';
      case 'explicit':
        return 'text-orange-500';
      case 'illegal':
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Modération IA
          </h2>
          <p className="text-muted-foreground">
            Contenus flaggés par l'IA nécessitant une revue manuelle
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} en attente</Badge>
          )}
          <Button variant="outline" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
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
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : f === 'rejected' ? 'Rejetés' : 'Tous'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'pending' 
                ? "Aucun contenu en attente de revue" 
                : "Aucun contenu dans cette catégorie"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      {getContentTypeIcon(item.content_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{item.content_type}</span>
                        {getRecommendationBadge(item.ai_recommendation)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className={`flex items-center gap-1 ${getCategoryColor(item.ai_category)}`}>
                          Catégorie: {item.ai_category || 'inconnue'}
                        </span>
                        <span>Confiance: {item.ai_confidence}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewDialog(item)}
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
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Examen du contenu flaggé par l'IA
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* AI Analysis Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Catégorie</p>
                  <p className={`font-medium ${getCategoryColor(selectedItem.ai_category)}`}>
                    {selectedItem.ai_category || 'Inconnue'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confiance</p>
                  <p className="font-medium">{selectedItem.ai_confidence}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommandation</p>
                  {getRecommendationBadge(selectedItem.ai_recommendation)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modèle IA</p>
                  <p className="font-medium text-xs">{selectedItem.ai_model || 'N/A'}</p>
                </div>
              </div>

              {/* AI Reason */}
              {selectedItem.ai_reason && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4" />
                    Analyse de l'IA
                  </h4>
                  <p className="text-sm">{selectedItem.ai_reason}</p>
                </div>
              )}

              {/* AI Flags */}
              {Object.keys(selectedItem.ai_flags || {}).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Flags détectés</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedItem.ai_flags).map(([flag, detected]) => (
                      detected && (
                        <Badge key={flag} variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {flag}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* AI Issues */}
              {selectedItem.ai_issues?.length > 0 && (
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
                  <h4 className="font-medium flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Problèmes détectés
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {selectedItem.ai_issues.map((issue, idx) => (
                      <li key={idx}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Aperçu du contenu</h4>
                <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
                  {signedUrl && selectedItem.content_type === 'image' ? (
                    <img 
                      src={signedUrl} 
                      alt="Content preview" 
                      className="max-h-96 rounded-lg object-contain"
                    />
                  ) : signedUrl && selectedItem.content_type === 'video' ? (
                    <video 
                      src={signedUrl} 
                      controls 
                      className="max-h-96 rounded-lg"
                    />
                  ) : (
                    <p className="text-muted-foreground">Aperçu non disponible</p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              {selectedItem.status === 'pending' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Notes admin</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Notes sur votre décision..."
                  />
                </div>
              )}

              {/* Existing admin notes */}
              {selectedItem.admin_notes && selectedItem.status !== 'pending' && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium">Notes de l'admin</p>
                  <p className="text-sm mt-1">{selectedItem.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Fermer
            </Button>
            {selectedItem?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(true)}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(false)}
                  disabled={isProcessing}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <ShieldX className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
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

export default AIModerationManager;
