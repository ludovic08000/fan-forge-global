import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Check, X, DollarSign, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrivateLiveRequest {
  id: string;
  proposed_date: string;
  proposed_duration: number;
  status: string;
  price: number | null;
  message: string | null;
  creator_response: string | null;
  creator_id: string;
  requester_id: string;
  requester_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface DayRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  requests: PrivateLiveRequest[];
  onRequestUpdate: (requestId: string, updates: Partial<PrivateLiveRequest>) => void;
}

const DayRequestsDialog: React.FC<DayRequestsDialogProps> = ({
  open,
  onOpenChange,
  date,
  requests,
  onRequestUpdate,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<PrivateLiveRequest | null>(null);
  const [priceDialog, setPriceDialog] = useState(false);
  const [price, setPrice] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500">Accepté - À payer</Badge>;
      case 'declined':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Payé ✓</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 10 || priceNum > 500) {
      toast.error('Le prix doit être entre 10€ et 500€');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('private_live_requests')
        .update({
          status: 'accepted',
          price: priceNum,
          creator_response: response.trim() || null
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Récupérer le user_id du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('user_id')
        .eq('id', selectedRequest.creator_id)
        .single();

      // Send automatic message
      const proposedDateFormatted = format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
      
      if (creatorData?.user_id) {
        await supabase
          .from('private_messages')
          .insert({
            creator_id: selectedRequest.creator_id,
            subscriber_id: selectedRequest.requester_id,
            sender_id: creatorData.user_id,
            message_type: 'text',
            content: `✅ Votre demande de live privé est acceptée !\n\n` +
              `📅 Date confirmée: ${proposedDateFormatted}\n` +
              `⏱️ Durée: ${selectedRequest.proposed_duration} minutes\n` +
              `💰 Prix: ${priceNum}€\n` +
              (response ? `\n💬 Message: ${response}\n` : '') +
              `\n➡️ Rendez-vous dans votre calendrier pour payer et confirmer.`
          });
      }

      toast.success('Demande acceptée !');
      onRequestUpdate(selectedRequest.id, { status: 'accepted', price: priceNum, creator_response: response.trim() || null });
      setPriceDialog(false);
      setSelectedRequest(null);
      setPrice('');
      setResponse('');
    } catch (error: any) {
      console.error('Error accepting:', error);
      toast.error(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (request: PrivateLiveRequest) => {
    setLoading(true);
    try {
      // Récupérer le user_id du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('user_id')
        .eq('id', request.creator_id)
        .single();

      const { error } = await supabase
        .from('private_live_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;

      // Send message
      if (creatorData?.user_id) {
        await supabase
          .from('private_messages')
          .insert({
            creator_id: request.creator_id,
            subscriber_id: request.requester_id,
            sender_id: creatorData.user_id,
            message_type: 'text',
            content: `❌ Désolé, je ne peux pas accepter votre demande de live privé pour le ${format(new Date(request.proposed_date), 'EEEE d MMMM à HH:mm', { locale: fr })}. N'hésitez pas à proposer une autre date !`
          });
      }

      toast.success('Demande refusée');
      onRequestUpdate(request.id, { status: 'declined' });
    } catch (error: any) {
      console.error('Error declining:', error);
      toast.error(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (!date) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogTitle>
            <DialogDescription>
              {requests.length === 0
                ? 'Aucune demande pour cette date'
                : `${requests.length} demande${requests.length > 1 ? 's' : ''} de live privé`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande pour cette date</p>
              </div>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-500/50 bg-yellow-500/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">
                            {request.requester_profile?.display_name || request.requester_profile?.username || 'Utilisateur'}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(request.proposed_date), 'HH:mm')}
                          </span>
                          <span>{request.proposed_duration} min</span>
                          {request.price && (
                            <span className="text-primary font-medium">{request.price}€</span>
                          )}
                        </div>

                        {request.message && (
                          <p className="text-sm bg-muted/50 p-2 rounded text-muted-foreground">
                            "{request.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedRequest(request);
                            setPriceDialog(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1">
                              <X className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Refuser cette demande ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Un message sera envoyé automatiquement à l'utilisateur.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDecline(request)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Refuser
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price dialog */}
      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixer le prix du live privé</DialogTitle>
            <DialogDescription>
              Fixez votre prix pour cette session (entre 10€ et 500€).
              15% de commission plateforme.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p><strong>Date:</strong> {format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</p>
                <p><strong>Durée:</strong> {selectedRequest.proposed_duration} minutes</p>
                <p><strong>De:</strong> {selectedRequest.requester_profile?.display_name || 'Utilisateur'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  min="10"
                  max="500"
                  step="1"
                  placeholder="Ex: 50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {price && parseFloat(price) >= 10 && (
                  <p className="text-xs text-muted-foreground">
                    Vous recevrez {(parseFloat(price) * 0.85).toFixed(2)}€
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">Message (optionnel)</Label>
                <Textarea
                  id="response"
                  placeholder="Un message pour l'utilisateur..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAccept} disabled={loading || !price}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accepter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DayRequestsDialog;
