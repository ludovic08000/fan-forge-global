import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Ban, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Calendar,
  User,
  XCircle,
  CheckCircle
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface CreatorWithNoShows {
  id: string;
  user_id: string;
  stage_name: string | null;
  noshow_count: number;
  noshow_penalty_level: number;
  lives_blocked_until: string | null;
  visibility_reduced: boolean;
  profiles: {
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
}

const NoShowManager = () => {
  const queryClient = useQueryClient();
  const [isRunningDetection, setIsRunningDetection] = useState(false);

  // Récupérer les créateurs avec des no-shows
  const { data: creators, isLoading, refetch } = useQuery({
    queryKey: ["admin-noshow-creators"],
    queryFn: async () => {
      const { data: creatorsData, error } = await supabase
        .from("creators")
        .select(`
          id,
          user_id,
          stage_name,
          noshow_count,
          noshow_penalty_level,
          lives_blocked_until,
          visibility_reduced
        `)
        .gt("noshow_count", 0)
        .order("noshow_count", { ascending: false });

      if (error) throw error;
      
      // Récupérer les profils séparément
      const userIds = creatorsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, avatar_url, display_name, username")
        .in("user_id", userIds);

      // Merger les données
      return (creatorsData || []).map(creator => ({
        ...creator,
        profiles: profilesData?.find(p => p.user_id === creator.user_id) || null
      })) as CreatorWithNoShows[];
    },
  });

  // Exécuter la détection automatique
  const runDetection = async () => {
    setIsRunningDetection(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-detect-noshow-private-lives");
      
      if (error) throw error;
      
      toast.success(`Détection terminée: ${data.processed} no-shows traités sur ${data.total} lives vérifiés`);
      refetch();
    } catch (error) {
      console.error("Erreur détection:", error);
      toast.error("Erreur lors de la détection automatique");
    } finally {
      setIsRunningDetection(false);
    }
  };

  // Mutation pour appliquer/retirer une pénalité
  const applyPenalty = useMutation({
    mutationFn: async ({ creatorId, level }: { creatorId: string; level: number }) => {
      const updates: Record<string, any> = {
        noshow_penalty_level: level,
        updated_at: new Date().toISOString(),
      };

      if (level === 0) {
        updates.visibility_reduced = false;
        updates.lives_blocked_until = null;
      } else if (level === 1) {
        updates.visibility_reduced = true;
        updates.lives_blocked_until = null;
      } else if (level === 2) {
        updates.visibility_reduced = true;
        updates.lives_blocked_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from("creators")
        .update(updates)
        .eq("id", creatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pénalité mise à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-noshow-creators"] });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Réinitialiser le compteur
  const resetCounter = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase
        .from("creators")
        .update({
          noshow_count: 0,
          noshow_penalty_level: 0,
          visibility_reduced: false,
          lives_blocked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compteur réinitialisé");
      queryClient.invalidateQueries({ queryKey: ["admin-noshow-creators"] });
    },
    onError: () => {
      toast.error("Erreur lors de la réinitialisation");
    },
  });

  const getPenaltyBadge = (level: number) => {
    switch (level) {
      case 0:
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Normal</Badge>;
      case 1:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Visibilité réduite</Badge>;
      case 2:
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Lives bloqués</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Gestion des No-Shows
          </CardTitle>
          <Button 
            onClick={runDetection} 
            disabled={isRunningDetection}
            variant="outline"
          >
            {isRunningDetection ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Lancer la détection
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{creators?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Créateurs avec no-shows</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {creators?.filter(c => c.noshow_penalty_level === 1).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Visibilité réduite</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-500">
                {creators?.filter(c => c.noshow_penalty_level === 2).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Lives bloqués</p>
            </div>
          </div>

          {!creators || creators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Aucun créateur avec des no-shows</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.profiles?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {creator.stage_name || creator.profiles?.display_name || "Créateur"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{creator.profiles?.username || "unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{creator.noshow_count}</p>
                      <p className="text-xs text-muted-foreground">No-shows</p>
                    </div>

                    {getPenaltyBadge(creator.noshow_penalty_level)}

                    {creator.lives_blocked_until && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Jusqu'au {new Date(creator.lives_blocked_until).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {creator.noshow_penalty_level !== 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-500 hover:text-yellow-600"
                          onClick={() => applyPenalty.mutate({ creatorId: creator.id, level: 1 })}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Réduire visibilité
                        </Button>
                      )}

                      {creator.noshow_penalty_level !== 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => applyPenalty.mutate({ creatorId: creator.id, level: 2 })}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Bloquer lives
                        </Button>
                      )}

                      {creator.noshow_penalty_level > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-500 hover:text-green-600"
                          onClick={() => applyPenalty.mutate({ creatorId: creator.id, level: 0 })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Lever pénalité
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Réinitialiser le compteur ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action va remettre à zéro le compteur de no-shows et retirer toutes les pénalités pour {creator.stage_name || "ce créateur"}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetCounter.mutate(creator.id)}>
                              Confirmer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Règles de pénalités automatiques
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">3+ no-shows</Badge>
            <span>→ Visibilité réduite dans les recherches</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/10 text-red-500">5+ no-shows</Badge>
            <span>→ Lives privés bloqués pendant 30 jours</span>
          </div>
          <p className="text-muted-foreground mt-4">
            Les frais Stripe (2.9% + 0.25€) sont automatiquement déduits des gains du créateur en cas de no-show.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoShowManager;
