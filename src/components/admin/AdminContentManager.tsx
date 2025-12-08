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
import { Search, Trash2, Eye, Image, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: 'image' | 'video';
  status: string;
  is_premium: boolean;
  is_preview: boolean;
  view_count: number;
  like_count: number;
  price: number;
  created_at: string;
  creator_id: string;
  file_url: string;
  thumbnail_url: string | null;
  creator?: {
    stage_name: string | null;
    user_id: string;
  };
}

const AdminContentManager = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          creator:creators!content_creator_id_fkey (
            stage_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Erreur chargement contenu:', error);
      toast.error('Erreur lors du chargement du contenu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      setDeletingId(contentId);
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      
      toast.success('Contenu supprimé');
      loadContent();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStatus = async (contentId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ status: newStatus })
        .eq('id', contentId);

      if (error) throw error;
      
      toast.success('Statut mis à jour');
      loadContent();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.creator?.stage_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.content_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

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
        <CardTitle>Gestion du contenu</CardTitle>
        <CardDescription>
          Tous les contenus des créateurs ({content.length} au total)
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
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Vidéos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tableau */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Créateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Vues</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucun contenu trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredContent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.content_type === 'image' ? (
                        <Image className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>{item.creator?.stage_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Select
                        value={item.status || 'published'}
                        onValueChange={(value) => handleUpdateStatus(item.id, value as 'draft' | 'published' | 'archived')}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Publié</SelectItem>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="archived">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_premium ? 'default' : 'secondary'}>
                        {item.is_premium ? 'Premium' : 'Gratuit'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.view_count}</TableCell>
                    <TableCell>{item.like_count}</TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(item.file_url, '_blank')}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
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
                              <AlertDialogTitle>Supprimer ce contenu ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le contenu "{item.title}" sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContent(item.id)}
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
          Affichage de {filteredContent.length} contenu(s) sur {content.length}
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminContentManager;
