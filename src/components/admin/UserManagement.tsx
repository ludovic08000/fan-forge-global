import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2, UserX, Users, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_creator: boolean;
  creator_id: string | null;
  is_suspended: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      // Charger les profils avec les infos créateurs et suspensions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Charger les créateurs
      const { data: creators, error: creatorsError } = await supabase
        .from('creators')
        .select('id, user_id');

      if (creatorsError) throw creatorsError;

      // Charger les suspensions actives
      const { data: suspensions, error: suspensionsError } = await supabase
        .from('user_suspensions')
        .select('user_id')
        .eq('is_active', true);

      if (suspensionsError) throw suspensionsError;

      const creatorMap = new Map(creators?.map(c => [c.user_id, c.id]) || []);
      const suspendedSet = new Set(suspensions?.map(s => s.user_id) || []);

      const usersData: UserData[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        is_creator: creatorMap.has(profile.user_id),
        creator_id: creatorMap.get(profile.user_id) || null,
        is_suspended: suspendedSet.has(profile.user_id),
      }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (userData: UserData) => {
    setDeletingUserId(userData.user_id);
    try {
      if (userData.is_creator && userData.creator_id) {
        // Supprimer le créateur et toutes ses données
        const { error } = await supabase.rpc('delete_creator_completely', {
          _creator_id: userData.creator_id
        });
        if (error) throw error;
      } else {
        // Supprimer l'utilisateur simple
        const { error } = await supabase.rpc('delete_user_completely', {
          _user_id: userData.user_id
        });
        if (error) throw error;
      }

      toast.success('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.display_name?.toLowerCase().includes(search) ||
      user.user_id.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des utilisateurs
        </CardTitle>
        <CardDescription>
          Visualisez et supprimez les comptes utilisateurs
        </CardDescription>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                    )}
                    {user.display_name || 'Sans nom'}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  @{user.username || 'N/A'}
                </TableCell>
                <TableCell>
                  {user.is_creator ? (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Créateur
                    </Badge>
                  ) : (
                    <Badge variant="outline">Utilisateur</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.is_suspended ? (
                    <Badge variant="destructive" className="gap-1">
                      <UserX className="h-3 w-3" />
                      Suspendu
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Actif</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={deletingUserId === user.user_id}
                      >
                        {deletingUserId === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Toutes les données de l'utilisateur 
                          {user.is_creator && " (y compris son contenu créateur)"} seront définitivement supprimées.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer définitivement
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Total :</strong> {users.length} utilisateurs ({users.filter(u => u.is_creator).length} créateurs)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
