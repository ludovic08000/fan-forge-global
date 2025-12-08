import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AccountDeletionProps {
  isCreator?: boolean;
  creatorId?: string;
}

const AccountDeletion: React.FC<AccountDeletionProps> = ({ isCreator = false, creatorId }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    setDeleting(true);
    try {
      if (isCreator && creatorId) {
        // Supprimer le compte créateur complet
        const { error } = await supabase.rpc('delete_creator_completely', {
          _creator_id: creatorId
        });
        if (error) throw error;
      } else {
        // Supprimer le compte utilisateur simple
        const { error } = await supabase.rpc('delete_user_completely', {
          _user_id: user.id
        });
        if (error) throw error;
      }

      toast.success('Votre compte a été supprimé');
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Supprimer mon compte
        </CardTitle>
        <CardDescription>
          {isCreator 
            ? "Supprimez définitivement votre compte créateur et tout votre contenu"
            : "Supprimez définitivement votre compte et toutes vos données"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Attention : cette action est irréversible</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Votre profil sera supprimé</li>
                <li>• Vos photos et données personnelles seront effacées</li>
                {isCreator && (
                  <>
                    <li>• Tout votre contenu sera supprimé</li>
                    <li>• Vos abonnés perdront l'accès à votre contenu</li>
                    <li>• Vos revenus en attente seront perdus</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Cette action ne peut pas être annulée. Votre compte et toutes vos données 
                  seront définitivement supprimés de nos serveurs.
                </p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    Tapez <span className="font-bold text-destructive">SUPPRIMER</span> pour confirmer :
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText('')}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'SUPPRIMER' || deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AccountDeletion;
