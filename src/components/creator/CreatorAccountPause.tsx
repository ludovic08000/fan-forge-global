import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PauseCircle, PlayCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreatorAccountPauseProps {
  creatorId: string;
}

const CreatorAccountPause: React.FC<CreatorAccountPauseProps> = ({ creatorId }) => {
  const { user } = useAuth();
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPauseStatus();
  }, [creatorId]);

  const loadPauseStatus = async () => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_my_creator_full')
        .maybeSingle();

      if (error) throw error;

      setIsPaused(data?.is_paused || false);
      setPausedAt(data?.paused_at ? new Date(data.paused_at) : null);
    } catch (error) {
      console.error('Error loading pause status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAccount = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({
          is_paused: true,
          paused_at: new Date().toISOString()
        })
        .eq('id', creatorId);

      if (error) throw error;

      setIsPaused(true);
      setPausedAt(new Date());
      toast.success('Votre compte est maintenant en pause');
    } catch (error) {
      console.error('Error pausing account:', error);
      toast.error('Erreur lors de la mise en pause');
    } finally {
      setUpdating(false);
    }
  };

  const handleReactivateAccount = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({
          is_paused: false,
          paused_at: null
        })
        .eq('id', creatorId);

      if (error) throw error;

      setIsPaused(false);
      setPausedAt(null);
      toast.success('Votre compte est réactivé !');
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast.error('Erreur lors de la réactivation');
    } finally {
      setUpdating(false);
    }
  };

  const getDaysRemaining = () => {
    if (!pausedAt) return 30;
    const deletionDate = addMonths(pausedAt, 1);
    return Math.max(0, differenceInDays(deletionDate, new Date()));
  };

  const getDeletionDate = () => {
    if (!pausedAt) return null;
    return addMonths(pausedAt, 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className={isPaused ? 'border-amber-500/50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPaused ? (
            <PauseCircle className="h-5 w-5 text-amber-500" />
          ) : (
            <PauseCircle className="h-5 w-5 text-muted-foreground" />
          )}
          Mettre en pause mon compte
        </CardTitle>
        <CardDescription>
          {isPaused 
            ? "Votre compte est actuellement en pause"
            : "Suspendez temporairement votre activité de créateur"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPaused ? (
          <>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">
                    Compte en pause depuis le {pausedAt && format(pausedAt, 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <strong>{getDaysRemaining()} jours restants</strong> avant la suppression automatique.
                    {getDeletionDate() && (
                      <span className="block mt-1">
                        Date de suppression : {format(getDeletionDate()!, 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Attention</p>
                  <p className="mt-1 text-muted-foreground">
                    Si vous ne réactivez pas votre compte avant la date limite, 
                    toutes vos données seront définitivement supprimées.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleReactivateAccount} 
              disabled={updating}
              className="w-full"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Réactiver mon compte
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                La mise en pause de votre compte :
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Cache votre profil aux autres utilisateurs</li>
                <li>• Suspend les nouveaux abonnements</li>
                <li>• Conserve tout votre contenu et vos abonnés</li>
                <li>• Vous pouvez réactiver à tout moment</li>
              </ul>
              <p className="mt-3 text-sm font-medium text-amber-600">
                ⚠️ Après 1 mois de pause, votre compte sera automatiquement supprimé
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Mettre en pause mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mettre en pause votre compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>Votre compte sera invisible pour les autres utilisateurs.</p>
                    <p className="mt-2 font-medium text-amber-600">
                      ⚠️ Important : Si vous ne réactivez pas votre compte dans les 30 jours,
                      toutes vos données seront automatiquement supprimées.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePauseAccount} disabled={updating}>
                    {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirmer la pause
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CreatorAccountPause;
