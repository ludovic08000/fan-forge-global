import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  Euro, 
  Play, 
  Bell,
  BellOff,
  History,
  CalendarDays,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  is_premium: boolean;
  price: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewer_count: number;
  recording_url: string | null;
  thumbnail_url: string | null;
}

interface LiveReservation {
  id: string;
  live_stream_id: string;
  notified: boolean;
  created_at: string;
  live_stream?: LiveStream;
}

const LiveHistory: React.FC = () => {
  const { user } = useAuth();
  const [pastLives, setPastLives] = useState<LiveStream[]>([]);
  const [reservations, setReservations] = useState<LiveReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Récupérer le creator_id de l'utilisateur
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creator) {
        // Récupérer l'historique des lives du créateur
        const { data: lives } = await supabase
          .from('live_streams')
          .select('*')
          .eq('creator_id', creator.id)
          .order('created_at', { ascending: false });

        if (lives) {
          setPastLives(lives as LiveStream[]);
        }
      }

      // Récupérer les réservations de l'utilisateur
      const { data: userReservations } = await supabase
        .from('live_reservations')
        .select(`
          id,
          live_stream_id,
          notified,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userReservations && userReservations.length > 0) {
        // Récupérer les détails des lives réservés
        const liveIds = userReservations.map(r => r.live_stream_id);
        const { data: liveDetails } = await supabase
          .from('live_streams')
          .select('*')
          .in('id', liveIds);

        const reservationsWithDetails = userReservations.map(r => ({
          ...r,
          live_stream: liveDetails?.find(l => l.id === r.live_stream_id) as LiveStream | undefined
        }));

        setReservations(reservationsWithDetails);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('live_reservations')
        .delete()
        .eq('id', reservationId);

      if (error) throw error;

      setReservations(prev => prev.filter(r => r.id !== reservationId));
      toast.success('Réservation annulée');
    } catch (error) {
      console.error('Erreur annulation:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">🔴 En direct</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">📅 Programmé</Badge>;
      case 'ended':
        return <Badge variant="outline">✓ Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (startedAt: string | null, endedAt: string | null) => {
    if (!startedAt || !endedAt) return 'N/A';
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique & Réservations
        </CardTitle>
        <CardDescription>
          Gérez vos lives passés et vos réservations à venir
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Mes lives ({pastLives.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Réservations ({reservations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              {pastLives.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun live enregistré</p>
                  <p className="text-sm">Vos lives apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastLives.map((live) => (
                    <div 
                      key={live.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{live.title}</h4>
                            {getStatusBadge(live.status)}
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {live.scheduled_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(live.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            )}
                            {live.status === 'ended' && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(live.started_at, live.ended_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {live.peak_viewer_count} max
                                </span>
                              </>
                            )}
                            {live.is_premium && (
                              <span className="flex items-center gap-1 text-primary">
                                <Euro className="h-3 w-3" />
                                {live.price}€
                              </span>
                            )}
                          </div>
                        </div>

                        {live.recording_url && live.status === 'ended' && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={live.recording_url} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4 mr-1" />
                              Replay
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reservations">
            <ScrollArea className="h-[400px]">
              {reservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune réservation</p>
                  <p className="text-sm">Réservez des lives pour être notifié</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((reservation) => {
                    const live = reservation.live_stream;
                    if (!live) return null;
                    
                    const isUpcoming = live.scheduled_at && isFuture(new Date(live.scheduled_at));
                    
                    return (
                      <div 
                        key={reservation.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{live.title}</h4>
                              {getStatusBadge(live.status)}
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              {live.scheduled_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {isUpcoming 
                                    ? `Dans ${formatDistanceToNow(new Date(live.scheduled_at), { locale: fr })}`
                                    : format(new Date(live.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                                  }
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                {reservation.notified ? (
                                  <>
                                    <Bell className="h-3 w-3 text-primary" />
                                    Notifié
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="h-3 w-3" />
                                    En attente
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {isUpcoming && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelReservation(reservation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LiveHistory;
