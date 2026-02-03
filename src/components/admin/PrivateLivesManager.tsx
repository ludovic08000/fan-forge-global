import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Video, Clock, DollarSign, RefreshCw, Loader2, User, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
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
  created_at: string;
  paid_at: string | null;
  no_show_reported_at: string | null;
  creator?: {
    stage_name: string | null;
    user_id: string;
  };
  requester_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  creator_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  revenue?: {
    gross_amount: number;
    platform_commission: number;
    creator_amount: number;
    status: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  paid: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  platformCommission: number;
}

const PrivateLivesManager = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PrivateLiveRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    accepted: 0,
    paid: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    platformCommission: 0
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger toutes les demandes
      const { data: requestsData, error } = await supabase
        .from('private_live_requests')
        .select('*')
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (error) throw error;

      if (requestsData) {
        // Enrichir avec les profils
        const enriched = await Promise.all(
          requestsData.map(async (req) => {
            // Profil du demandeur
            const { data: requesterProfile } = await supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', req.requester_id)
              .single();

            // Données du créateur
            const { data: creator } = await supabase
              .from('creators')
              .select('stage_name, user_id')
              .eq('id', req.creator_id)
              .single();

            // Profil du créateur
            let creatorProfile = null;
            if (creator?.user_id) {
              const { data: cp } = await supabase
                .from('profiles')
                .select('display_name, username, avatar_url')
                .eq('user_id', creator.user_id)
                .single();
              creatorProfile = cp;
            }

            // Revenu si payé
            let revenue = null;
            if (req.status === 'paid' || req.status === 'completed') {
              const { data: rev } = await supabase
                .from('private_live_revenue')
                .select('gross_amount, platform_commission, creator_amount, status')
                .eq('private_live_request_id', req.id)
                .single();
              revenue = rev;
            }

            return {
              ...req,
              requester_profile: requesterProfile,
              creator,
              creator_profile: creatorProfile,
              revenue
            };
          })
        );

        setRequests(enriched);

        // Calculer les stats
        const newStats: Stats = {
          total: enriched.length,
          pending: enriched.filter(r => r.status === 'pending').length,
          accepted: enriched.filter(r => r.status === 'accepted').length,
          paid: enriched.filter(r => r.status === 'paid').length,
          completed: enriched.filter(r => r.status === 'completed').length,
          cancelled: enriched.filter(r => r.status === 'cancelled').length,
          totalRevenue: enriched.reduce((acc, r) => acc + (r.revenue?.gross_amount || 0), 0),
          platformCommission: enriched.reduce((acc, r) => acc + (r.revenue?.platform_commission || 0), 0)
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortOrder]);

  const getStatusBadge = (status: string, noShowReported: boolean) => {
    if (noShowReported) {
      return <Badge variant="destructive">No-show signalé</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500">Accepté</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Payé</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Annulé</Badge>;
      case 'declined':
        return <Badge variant="destructive">Refusé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = search === '' || 
      r.creator?.stage_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_profile?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_profile?.username?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total demandes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.accepted}</div>
            <div className="text-sm text-muted-foreground">Acceptées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Payées</div>
          </CardContent>
        </Card>
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)}€</div>
            <div className="text-sm text-muted-foreground">CA Total</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.platformCommission.toFixed(2)}€</div>
            <div className="text-sm text-muted-foreground">Commission (15%)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Lives Privés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par créateur ou utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
                <SelectItem value="declined">Refusé</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune demande de live privé trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date demande</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Date proposée</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.creator_profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {(request.creator?.stage_name || 'C').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {request.creator?.stage_name || 'Créateur'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {(request.requester_profile?.display_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {request.requester_profile?.display_name || request.requester_profile?.username || 'Utilisateur'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(request.proposed_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {request.proposed_duration} min
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.price ? (
                          <span className="font-medium">{request.price}€</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status, !!request.no_show_reported_at)}
                      </TableCell>
                      <TableCell>
                        {request.revenue ? (
                          <span className="text-green-500 font-medium">
                            +{request.revenue.platform_commission.toFixed(2)}€
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivateLivesManager;
