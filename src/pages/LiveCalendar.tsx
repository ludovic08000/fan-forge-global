import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Video, Check, X, DollarSign, Loader2, MessageCircle, ArrowLeft, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PrivateLiveRequest {
  id: string;
  creator_id: string;
  requester_id: string;
  proposed_date: string;
  proposed_duration: number;
  message: string | null;
  price: number | null;
  currency: string;
  status: string;
  creator_response: string | null;
  created_at: string;
  requester_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  creator?: {
    stage_name: string | null;
  };
}

const LiveCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [requests, setRequests] = useState<PrivateLiveRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PrivateLiveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PrivateLiveRequest | null>(null);
  const [responseDialog, setResponseDialog] = useState(false);
  const [price, setPrice] = useState('');
  const [response, setResponse] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  // Vérifier le paramètre de paiement
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const requestId = searchParams.get('request');
    
    if (paymentStatus === 'success' && requestId) {
      toast.success('Paiement réussi ! 🎉', {
        description: 'Votre live privé est confirmé. Le créateur vous contactera bientôt.'
      });
      // Nettoyer l'URL
      navigate('/live-calendar', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info('Paiement annulé');
      navigate('/live-calendar', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Vérifier si l'utilisateur est un créateur
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (creatorData) {
          setCreatorId(creatorData.id);
          
          // Charger les demandes reçues (en tant que créateur)
          const { data: receivedRequests } = await supabase
            .from('private_live_requests')
            .select('*')
            .eq('creator_id', creatorData.id)
            .order('created_at', { ascending: false });

          // Enrichir avec les profils des demandeurs
          if (receivedRequests) {
            const enrichedRequests = await Promise.all(
              receivedRequests.map(async (req) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('display_name, username, avatar_url')
                  .eq('user_id', req.requester_id)
                  .single();
                return { ...req, requester_profile: profile };
              })
            );
            setRequests(enrichedRequests);
          }
        }

        // Charger mes demandes envoyées (en tant qu'utilisateur)
        const { data: sentRequests } = await supabase
          .from('private_live_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });

        if (sentRequests) {
          const enrichedSent = await Promise.all(
            sentRequests.map(async (req) => {
              const { data: creator } = await supabase
                .from('creators')
                .select('stage_name')
                .eq('id', req.creator_id)
                .single();
              return { ...req, creator };
            })
          );
          setMyRequests(enrichedSent);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleAccept = async () => {
    if (!selectedRequest) return;
    
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 10 || priceNum > 500) {
      toast.error('Le prix doit être entre 10€ et 500€');
      return;
    }

    setActionLoading(true);
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

      // Envoyer un message automatique
      await supabase
        .from('private_messages')
        .insert({
          creator_id: selectedRequest.creator_id,
          subscriber_id: selectedRequest.requester_id,
          sender_type: 'creator',
          message_type: 'text',
          content: `✅ Votre demande de live privé est acceptée !\n\n` +
            `📅 Date: ${format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}\n` +
            `💰 Prix: ${priceNum}€\n` +
            (response ? `\n💬 ${response}` : '') +
            `\n\n➡️ Cliquez sur le lien dans votre calendrier pour payer et confirmer.`
        });

      toast.success('Demande acceptée !');
      setResponseDialog(false);
      setSelectedRequest(null);
      setPrice('');
      setResponse('');

      // Recharger les demandes
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: 'accepted', price: priceNum, creator_response: response.trim() || null }
          : r
      ));
    } catch (error: any) {
      console.error('Error accepting:', error);
      toast.error(error.message || 'Erreur lors de l\'acceptation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { error } = await supabase
        .from('private_live_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // Envoyer un message
      await supabase
        .from('private_messages')
        .insert({
          creator_id: request.creator_id,
          subscriber_id: request.requester_id,
          sender_type: 'creator',
          message_type: 'text',
          content: `❌ Désolé, je ne peux pas accepter votre demande de live privé pour cette date. N'hésitez pas à proposer une autre date !`
        });

      toast.success('Demande refusée');
      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'declined' } : r
      ));
    } catch (error: any) {
      console.error('Error declining:', error);
      toast.error(error.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (request: PrivateLiveRequest) => {
    setPaymentLoading(request.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-private-live-checkout', {
        body: { requestId: request.id }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL de paiement non reçue');

      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Erreur lors de la création du paiement');
    } finally {
      setPaymentLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500">Accepté - À payer</Badge>;
      case 'declined':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Payé ✓</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Lives Privés
            </h1>
            <p className="text-muted-foreground">
              Gérez vos demandes de lives privés exclusifs
            </p>
          </div>
        </div>

        <Tabs defaultValue={creatorId ? "received" : "sent"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            {creatorId && (
              <TabsTrigger value="received" className="gap-2">
                <Video className="h-4 w-4" />
                Demandes reçues
                {requests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {requests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="sent" className="gap-2">
              <User className="h-4 w-4" />
              Mes demandes
            </TabsTrigger>
          </TabsList>

          {/* Demandes reçues (créateur) */}
          {creatorId && (
            <TabsContent value="received" className="space-y-4">
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aucune demande de live privé pour l'instant
                    </p>
                  </CardContent>
                </Card>
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className={request.status === 'pending' ? 'border-primary/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(request.requester_profile?.display_name || request.requester_profile?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {request.requester_profile?.display_name || request.requester_profile?.username || 'Utilisateur'}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(request.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {request.proposed_duration} min
                            </span>
                          </div>
                          
                          {request.message && (
                            <p className="text-sm bg-muted/50 p-2 rounded mb-2">
                              "{request.message}"
                            </p>
                          )}

                          {request.price && (
                            <p className="text-sm font-medium text-primary">
                              Prix fixé: {request.price}€
                            </p>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setResponseDialog(true);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecline(request.id)}
                              disabled={actionLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          {/* Mes demandes envoyées */}
          <TabsContent value="sent" className="space-y-4">
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore demandé de live privé
                  </p>
                  <Button onClick={() => navigate('/search')}>
                    Découvrir des créateurs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            Live avec {request.creator?.stage_name || 'Créateur'}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(request.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {request.proposed_duration} min
                          </span>
                        </div>

                        {request.creator_response && (
                          <p className="text-sm bg-muted/50 p-2 rounded mb-2">
                            💬 {request.creator_response}
                          </p>
                        )}

                        {request.price && (
                          <p className="text-sm font-medium">
                            Prix: <span className="text-primary">{request.price}€</span>
                          </p>
                        )}
                      </div>

                      {request.status === 'accepted' && request.price && (
                        <Button
                          onClick={() => handlePay(request)}
                          disabled={paymentLoading === request.id}
                          className="shrink-0"
                        >
                          {paymentLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <DollarSign className="h-4 w-4 mr-1" />
                          )}
                          Payer {request.price}€
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog pour accepter et fixer le prix */}
        <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accepter la demande de live privé</DialogTitle>
              <DialogDescription>
                Fixez votre prix pour cette session privée (entre 10€ et 500€).
                La plateforme prélève 15% de commission.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p><strong>Date:</strong> {format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</p>
                  <p><strong>Durée:</strong> {selectedRequest.proposed_duration} minutes</p>
                  {selectedRequest.message && (
                    <p><strong>Message:</strong> {selectedRequest.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Prix du live privé (€)</Label>
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
                      Vous recevrez {(parseFloat(price) * 0.85).toFixed(2)}€ (après 15% de commission)
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
              <Button variant="outline" onClick={() => setResponseDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAccept} disabled={actionLoading || !price}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Accepter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LiveCalendar;
