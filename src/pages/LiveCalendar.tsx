import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar as CalendarIcon, Clock, Video, Check, X, DollarSign, Loader2, ArrowLeft, User, Ban, RefreshCw, AlertTriangle, Send, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PrivateLiveCalendar from '@/components/live/PrivateLiveCalendar';
import DayRequestsDialog from '@/components/live/DayRequestsDialog';
import CreatorDateProposal from '@/components/live/CreatorDateProposal';

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
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [noShowLoading, setNoShowLoading] = useState<string | null>(null);
  
  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayRequestsDialogOpen, setDayRequestsDialogOpen] = useState(false);
  const [selectedDayRequests, setSelectedDayRequests] = useState<PrivateLiveRequest[]>([]);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

  // Vérifier le paramètre de paiement avec confirmation détaillée
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const requestId = searchParams.get('request');
    
    if (paymentStatus === 'success' && requestId) {
      // Récupérer les détails de la demande pour afficher un toast complet
      const fetchRequestDetails = async () => {
        const { data: request } = await supabase
          .from('private_live_requests')
          .select('*, creators:creator_id(stage_name)')
          .eq('id', requestId)
          .single();

        if (request) {
          const formattedDate = format(new Date(request.proposed_date), 'EEEE d MMMM à HH:mm', { locale: fr });
          toast.success('Paiement confirmé ! 🎉', {
            description: `Live privé avec ${(request as any).creators?.stage_name || 'le créateur'} le ${formattedDate} pour ${request.price}€. Vérifiez vos messages pour plus de détails.`,
            duration: 8000,
          });
        } else {
          toast.success('Paiement réussi ! 🎉', {
            description: 'Votre live privé est confirmé. Vérifiez vos messages pour plus de détails.',
            duration: 6000,
          });
        }
      };
      
      fetchRequestDetails();
      navigate('/live-calendar', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info('Paiement annulé', {
        description: 'Vous pouvez réessayer quand vous le souhaitez.'
      });
      navigate('/live-calendar', { replace: true });
    }
  }, [searchParams, navigate]);

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

  useEffect(() => {
    loadData();
  }, [user]);

  // Realtime subscription pour les mises à jour de statut
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('private-live-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_live_requests',
        },
        async (payload) => {
          const updatedRequest = payload.new as any;
          
          // Mettre à jour les demandes reçues (créateur)
          setRequests(prev => prev.map(r => 
            r.id === updatedRequest.id 
              ? { ...r, ...updatedRequest }
              : r
          ));
          
          // Mettre à jour mes demandes envoyées
          if (updatedRequest.requester_id === user.id) {
            // Enrichir avec les infos du créateur
            const { data: creator } = await supabase
              .from('creators')
              .select('stage_name')
              .eq('id', updatedRequest.creator_id)
              .single();
              
            setMyRequests(prev => prev.map(r => 
              r.id === updatedRequest.id 
                ? { ...r, ...updatedRequest, creator }
                : r
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_live_requests',
        },
        () => {
          // Recharger toutes les données pour les nouvelles demandes
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      // Récupérer le stage_name et user_id du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('stage_name, user_id')
        .eq('id', selectedRequest.creator_id)
        .single();

      const creatorName = creatorData?.stage_name || 'Le créateur';
      const creatorUserId = creatorData?.user_id;
      const proposedDateFormatted = format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
      
      // Envoyer un message privé avec appel à l'action clair
      if (creatorUserId) {
        await supabase
          .from('private_messages')
          .insert({
            creator_id: selectedRequest.creator_id,
            subscriber_id: selectedRequest.requester_id,
            sender_id: creatorUserId,
            message_type: 'text',
            content: `🎉 **Bonne nouvelle ! Votre demande de live privé est acceptée !**\n\n` +
              `📅 **Date:** ${proposedDateFormatted}\n` +
              `⏱️ **Durée:** ${selectedRequest.proposed_duration} minutes\n` +
              `💰 **Prix:** ${priceNum}€\n` +
              (response ? `\n💬 **Message:** ${response}\n` : '') +
              `\n━━━━━━━━━━━━━━━━━━━━━━\n` +
              `\n🔥 **Payez maintenant pour réserver votre place !**\n` +
              `➡️ Rendez-vous dans "Lives Privés" > "Mes demandes" pour finaliser le paiement.\n` +
              `\n⚠️ Attention : la réservation n'est confirmée qu'après paiement.`
          });
      }

      // Créer une notification pour l'utilisateur
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedRequest.requester_id,
          type: 'live_accepted',
          title: `${creatorName} a accepté votre live privé ! 🎬`,
          message: `Payez ${priceNum}€ pour confirmer votre live du ${proposedDateFormatted}`,
          data: {
            request_id: selectedRequest.id,
            creator_id: selectedRequest.creator_id,
            price: priceNum,
            proposed_date: selectedRequest.proposed_date
          }
        });

      toast.success('Demande acceptée !', {
        description: 'L\'utilisateur a reçu un message et une notification pour payer.'
      });
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

      // Récupérer le user_id du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('user_id')
        .eq('id', request.creator_id)
        .single();

      const { error } = await supabase
        .from('private_live_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // Envoyer un message
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

  const handleCancel = async (requestId: string, isPaid: boolean) => {
    setCancelLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-private-live', {
        body: { requestId, reason: cancelReason.trim() || undefined }
      });

      if (error) throw error;

      toast.success(data.refunded ? 'Live annulé, remboursement en cours' : 'Live annulé');
      setCancelReason('');

      // Mettre à jour les listes
      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'cancelled' } : r
      ));
      setMyRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'cancelled' } : r
      ));
    } catch (error: any) {
      console.error('Error cancelling:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setCancelLoading(null);
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

  const handleReportNoShow = async (requestId: string) => {
    setNoShowLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('report-private-live-noshow', {
        body: { requestId }
      });

      if (error) throw error;

      toast.success('No-show signalé', {
        description: 'Remboursement intégral en cours (5-10 jours ouvrés)'
      });

      setMyRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'cancelled' } : r
      ));
    } catch (error: any) {
      console.error('Error reporting no-show:', error);
      toast.error(error.message || 'Erreur lors du signalement');
    } finally {
      setNoShowLoading(null);
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
        return <Badge variant="outline" className="text-muted-foreground">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const CancelButton = ({ request, isCreator }: { request: PrivateLiveRequest; isCreator: boolean }) => {
    const canCancel = ['pending', 'accepted', 'paid'].includes(request.status);
    if (!canCancel) return null;

    const isPaid = request.status === 'paid';

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={cancelLoading === request.id}
          >
            {cancelLoading === request.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Ban className="h-4 w-4 mr-1" />
                Annuler
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le live privé ?</AlertDialogTitle>
            <AlertDialogDescription>
              {isPaid ? (
                <>
                  <span className="text-destructive font-medium">Ce live a déjà été payé.</span>
                  <br />
                  L'utilisateur sera remboursé intégralement. Cette action est irréversible.
                </>
              ) : (
                "Cette action est irréversible. L'autre partie sera notifiée de l'annulation."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancel-reason">Raison (optionnel)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Pourquoi annulez-vous ce live ?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason('')}>Non, garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCancel(request.id, isPaid)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPaid && <RefreshCw className="h-4 w-4 mr-2" />}
              {isPaid ? 'Annuler et rembourser' : 'Oui, annuler'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
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
              <CalendarIcon className="h-6 w-6 text-primary" />
              Lives Privés
            </h1>
            <p className="text-muted-foreground">
              Gérez vos demandes de lives privés exclusifs
            </p>
          </div>
        </div>

        <Tabs defaultValue={creatorId ? "calendar" : "sent"} className="space-y-6">
          <TabsList className={`grid w-full ${creatorId ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {creatorId && (
              <>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendrier
                </TabsTrigger>
                <TabsTrigger value="received" className="gap-2">
                  <Video className="h-4 w-4" />
                  Demandes
                  {requests.filter(r => r.status === 'pending').length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {requests.filter(r => r.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="sent" className="gap-2">
              <User className="h-4 w-4" />
              Mes demandes
            </TabsTrigger>
          </TabsList>

          {/* Calendar view (créateur) */}
          {creatorId && (
            <TabsContent value="calendar" className="space-y-4">
              {/* Action button */}
              <div className="flex justify-end">
                <Button onClick={() => setProposalDialogOpen(true)} className="gap-2">
                  <Send className="h-4 w-4" />
                  Proposer une date à mes abonnés
                </Button>
              </div>

              {/* Visual calendar */}
              <PrivateLiveCalendar
                requests={requests}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                selectedDate={selectedDate}
                onDateClick={(date, dayRequests) => {
                  setSelectedDate(date);
                  setSelectedDayRequests(dayRequests);
                  if (dayRequests.length > 0) {
                    setDayRequestsDialogOpen(true);
                  }
                }}
              />

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {requests.filter(r => r.status === 'pending').length}
                    </div>
                    <div className="text-xs text-muted-foreground">En attente</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {requests.filter(r => r.status === 'accepted').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Acceptées</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {requests.filter(r => r.status === 'paid').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Confirmées</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {requests.filter(r => r.status === 'paid').reduce((acc, r) => acc + (r.price || 0) * 0.85, 0).toFixed(0)}€
                    </div>
                    <div className="text-xs text-muted-foreground">Revenus</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Demandes reçues (créateur) - liste */}
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
                  <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-500/50 bg-yellow-500/5' : ''}>
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
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="font-medium text-foreground">
                                {format(new Date(request.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                              </span>
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

                        <div className="flex flex-col gap-2">
                          {request.status === 'pending' && (
                            <>
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
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </>
                          )}
                          <CancelButton request={request} isCreator={true} />
                        </div>
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
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="font-medium text-foreground">
                              {format(new Date(request.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                            </span>
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

                      <div className="flex flex-col gap-2">
                        {request.status === 'accepted' && request.price && (
                          <Button
                            onClick={() => handlePay(request)}
                            disabled={paymentLoading === request.id}
                          >
                            {paymentLoading === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <DollarSign className="h-4 w-4 mr-1" />
                            )}
                            Payer {request.price}€
                          </Button>
                        )}
                        
                        {/* Bouton signaler no-show - visible après la date + durée + 30min */}
                        {request.status === 'paid' && (() => {
                          const liveDate = new Date(request.proposed_date);
                          const liveEndTime = new Date(liveDate.getTime() + (request.proposed_duration || 30) * 60 * 1000 + 30 * 60 * 1000);
                          return new Date() > liveEndTime;
                        })() && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={noShowLoading === request.id}
                              >
                                {noShowLoading === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Signaler no-show
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Signaler un no-show ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Si le créateur ne s'est pas présenté au live privé prévu, 
                                  vous serez remboursé intégralement sous 5-10 jours ouvrés.
                                  <br /><br />
                                  <span className="text-destructive font-medium">
                                    Attention : Les faux signalements peuvent entraîner la suspension de votre compte.
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReportNoShow(request.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Confirmer le no-show
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        
                        <CancelButton request={request} isCreator={false} />
                      </div>
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
                <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                  <p><strong>Date proposée par l'utilisateur:</strong></p>
                  <p className="text-primary font-medium">
                    {format(new Date(selectedRequest.proposed_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
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

        {/* Day requests dialog */}
        <DayRequestsDialog
          open={dayRequestsDialogOpen}
          onOpenChange={setDayRequestsDialogOpen}
          date={selectedDate}
          requests={selectedDayRequests}
          onRequestUpdate={(requestId, updates) => {
            setRequests(prev => prev.map(r => 
              r.id === requestId ? { ...r, ...updates } : r
            ));
            setSelectedDayRequests(prev => prev.map(r =>
              r.id === requestId ? { ...r, ...updates } : r
            ));
          }}
        />

        {/* Creator date proposal dialog */}
        {creatorId && (
          <CreatorDateProposal
            open={proposalDialogOpen}
            onOpenChange={setProposalDialogOpen}
            creatorId={creatorId}
          />
        )}
      </div>
    </div>
  );
};

export default LiveCalendar;
