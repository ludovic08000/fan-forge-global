import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Search, Trash2, Eye, Radio, Users, Loader2, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_premium: boolean;
  price: number;
  viewer_count: number;
  peak_viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  creator_id: string;
  creator?: {
    stage_name: string | null;
    user_id: string;
  };
}

const AdminLiveManager = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadLiveStreams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          creator:creators!live_streams_creator_id_fkey (
            stage_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLiveStreams(data || []);
    } catch (error) {
      console.error('Erreur chargement lives:', error);
      toast.error('Erreur lors du chargement des lives');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLive = async (liveId: string) => {
    try {
      setDeletingId(liveId);
      
      // Supprimer les données liées d'abord
      await supabase.from('live_stream_messages').delete().eq('live_stream_id', liveId);
      await supabase.from('live_stream_viewers').delete().eq('live_stream_id', liveId);
      await supabase.from('live_stream_settings').delete().eq('live_stream_id', liveId);
      await supabase.from('live_stream_bans').delete().eq('live_stream_id', liveId);
      await supabase.from('live_stream_payments').delete().eq('live_stream_id', liveId);
      await supabase.from('live_stream_revenue').delete().eq('live_stream_id', liveId);
      
      // Puis supprimer le live
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', liveId);

      if (error) throw error;
      
      toast.success('Live supprimé');
      loadLiveStreams();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStopLive = async (liveId: string) => {
    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', liveId);

      if (error) throw error;
      
      toast.success('Live arrêté');
      loadLiveStreams();
    } catch (error) {
      console.error('Erreur arrêt live:', error);
      toast.error('Erreur lors de l\'arrêt du live');
    }
  };

  useEffect(() => {
    loadLiveStreams();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      live: 'destructive',
      scheduled: 'secondary',
      ended: 'outline',
      cancelled: 'outline',
    };
    const labels: Record<string, string> = {
      live: '🔴 En direct',
      scheduled: '📅 Programmé',
      ended: 'Terminé',
      cancelled: 'Annulé',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filteredLives = liveStreams.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.creator?.stage_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeLives = liveStreams.filter(l => l.status === 'live').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Gestion des lives
        </CardTitle>
        <CardDescription>
          {activeLives > 0 && (
            <span className="text-destructive font-medium mr-2">
              🔴 {activeLives} live(s) en cours
            </span>
          )}
          {liveStreams.length} live(s) au total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, créateur ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="live">En direct</SelectItem>
              <SelectItem value="scheduled">Programmé</SelectItem>
              <SelectItem value="ended">Terminé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tableau */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Créateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Spectateurs</TableHead>
                <TableHead>Pic</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucun live trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredLives.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>{item.creator?.stage_name || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(item.status || 'scheduled')}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_premium ? 'default' : 'secondary'}>
                        {item.is_premium ? `${item.price}€` : 'Gratuit'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.viewer_count}
                      </div>
                    </TableCell>
                    <TableCell>{item.peak_viewer_count}</TableCell>
                    <TableCell>
                      {item.started_at 
                        ? new Date(item.started_at).toLocaleString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.status === 'live' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/watch/${item.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStopLive(item.id)}
                            >
                              <StopCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce live ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le live "{item.title}" et toutes ses données associées seront définitivement supprimés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteLive(item.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          Affichage de {filteredLives.length} live(s) sur {liveStreams.length}
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminLiveManager;
