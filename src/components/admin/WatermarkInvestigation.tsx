/**
 * Interface d'investigation des watermarks forensiques
 * Permet aux admins d'identifier l'utilisateur source d'une fuite de contenu
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Fingerprint,
  Clock,
  CreditCard,
  Save,
  History,
  UserX,
  RefreshCw,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

interface InvestigationResult {
  success: boolean;
  userId?: string;
  userEmail?: string;
  username?: string;
  displayName?: string;
  leakTimestamp?: string;
  watermarkPattern?: string;
  shortId?: string;
  subscriptions?: Array<{
    creator_id: string;
    creator_name: string;
    status: string;
    start_date: string;
  }>;
  error?: string;
}

interface ContentLeak {
  id: string;
  user_id: string;
  watermark_pattern: string;
  short_id: string;
  leak_timestamp: string | null;
  detected_at: string;
  source_url: string | null;
  notes: string | null;
  status: string;
  action_taken: string | null;
  action_taken_at: string | null;
}

interface Recidivist {
  user_id: string;
  user_email: string;
  username: string;
  leak_count: number;
  first_leak: string;
  last_leak: string;
}

interface SuspensionTarget {
  userId: string;
  username: string;
  email: string;
  leakId?: string;
}

const WatermarkInvestigation = () => {
  const { user } = useAuth();
  const [watermarkPattern, setWatermarkPattern] = useState('');
  const [shortId, setShortId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [leakHistory, setLeakHistory] = useState<ContentLeak[]>([]);
  const [recidivists, setRecidivists] = useState<Recidivist[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionTarget, setSuspensionTarget] = useState<SuspensionTarget | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspending, setSuspending] = useState(false);

  /**
   * Charger l'historique des fuites et les récidivistes
   */
  const loadData = async () => {
    setLoadingHistory(true);
    try {
      // Charger l'historique des fuites
      const { data: leaks, error: leaksError } = await supabase
        .from('content_leaks')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (leaksError) throw leaksError;
      setLeakHistory(leaks || []);

      // Charger les récidivistes
      const { data: recidivistsData, error: recidivistsError } = await supabase
        .rpc('get_recidivist_users', { min_leaks: 2 });

      if (recidivistsError) throw recidivistsError;
      setRecidivists(recidivistsData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Lancer l'investigation via l'edge function
   */
  const investigate = async () => {
    if (!watermarkPattern && !shortId) {
      toast.error('Veuillez entrer un pattern de watermark ou un ID court');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('decode-watermark', {
        body: {
          watermarkPattern: watermarkPattern || undefined,
          shortId: shortId || undefined,
        },
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast.success('Utilisateur identifié avec succès');
      } else {
        toast.error(data.error || 'Aucun utilisateur trouvé');
      }
    } catch (error: any) {
      console.error('Erreur investigation:', error);
      toast.error('Erreur lors de l\'investigation');
      setResult({
        success: false,
        error: error.message || 'Erreur inconnue',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enregistrer la fuite dans la base de données
   */
  const saveLeak = async () => {
    if (!result?.success || !result.userId) {
      toast.error('Aucun utilisateur identifié à enregistrer');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('content_leaks').insert({
        user_id: result.userId,
        watermark_pattern: result.watermarkPattern || watermarkPattern || '',
        short_id: result.shortId || shortId || result.userId.substring(0, 8),
        leak_timestamp: result.leakTimestamp || null,
        detected_by: user?.id,
        source_url: sourceUrl || null,
        notes: notes || null,
        status: 'detected',
      });

      if (error) throw error;

      toast.success('Fuite enregistrée avec succès');
      setSourceUrl('');
      setNotes('');
      loadData(); // Recharger les données
    } catch (error: any) {
      console.error('Erreur enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Mettre à jour le statut d'une fuite
   */
  const updateLeakStatus = async (leakId: string, status: string, action?: string) => {
    try {
      const updateData: any = { status };
      if (action) {
        updateData.action_taken = action;
        updateData.action_taken_at = new Date().toISOString();
        updateData.action_taken_by = user?.id;
      }

      const { error } = await supabase
        .from('content_leaks')
        .update(updateData)
        .eq('id', leakId);

      if (error) throw error;
      toast.success('Statut mis à jour');
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  /**
   * Ouvrir le dialogue de suspension
   */
  const openSuspendDialog = (target: SuspensionTarget) => {
    setSuspensionTarget(target);
    setSuspensionReason('Fuite de contenu protégé');
    setShowSuspendDialog(true);
  };

  /**
   * Suspendre un utilisateur après confirmation
   */
  const confirmSuspension = async () => {
    if (!suspensionTarget || !user?.id || !suspensionReason.trim()) {
      toast.error('Veuillez fournir une raison pour la suspension');
      return;
    }

    setSuspending(true);
    try {
      // Créer l'enregistrement de suspension
      const { error: suspensionError } = await supabase
        .from('user_suspensions')
        .insert({
          user_id: suspensionTarget.userId,
          suspended_by: user.id,
          reason: suspensionReason,
          leak_id: suspensionTarget.leakId || null,
        });

      if (suspensionError) throw suspensionError;

      // Si une fuite est associée, mettre à jour son statut
      if (suspensionTarget.leakId) {
        await updateLeakStatus(suspensionTarget.leakId, 'suspended', 'Compte suspendu');
      }

      toast.success(`Utilisateur ${suspensionTarget.username || suspensionTarget.email} suspendu`);
      setShowSuspendDialog(false);
      setSuspensionTarget(null);
      setSuspensionReason('');
      loadData();
    } catch (error: any) {
      console.error('Erreur suspension:', error);
      toast.error('Erreur lors de la suspension');
    } finally {
      setSuspending(false);
    }
  };

  /**
   * Réinitialiser le formulaire
   */
  const resetForm = () => {
    setWatermarkPattern('');
    setShortId('');
    setSourceUrl('');
    setNotes('');
    setResult(null);
  };

  /**
   * Obtenir la couleur du badge selon le statut
   */
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      detected: 'destructive',
      investigating: 'secondary',
      warned: 'outline',
      suspended: 'default',
      resolved: 'default',
    };
    return variants[status] || 'default';
  };

  /**
   * Compter les fuites pour un utilisateur
   */
  const getUserLeakCount = (userId: string) => {
    return leakHistory.filter(leak => leak.user_id === userId).length;
  };

  /**
   * Obtenir les infos d'un utilisateur depuis une fuite
   */
  const getLeakUserInfo = (leak: ContentLeak): SuspensionTarget => {
    return {
      userId: leak.user_id,
      username: leak.short_id,
      email: leak.user_id,
      leakId: leak.id,
    };
  };

  return (
    <Tabs defaultValue="investigate" className="space-y-6">
      <TabsList>
        <TabsTrigger value="investigate" className="flex items-center gap-1">
          <Search className="h-3 w-3" />
          Investigation
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-1">
          <History className="h-3 w-3" />
          Historique ({leakHistory.length})
        </TabsTrigger>
        <TabsTrigger value="recidivists" className="flex items-center gap-1">
          <UserX className="h-3 w-3" />
          Récidivistes ({recidivists.length})
        </TabsTrigger>
      </TabsList>

      {/* Onglet Investigation */}
      <TabsContent value="investigate" className="space-y-6">
        {/* Formulaire de recherche */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Investigation de fuite
            </CardTitle>
            <CardDescription>
              Identifiez l'utilisateur source d'une fuite de contenu via le watermark forensique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="watermarkPattern">Pattern de watermark complet</Label>
                <Input
                  id="watermarkPattern"
                  placeholder="ex: a1b2c3d4-20241208143022"
                  value={watermarkPattern}
                  onChange={(e) => setWatermarkPattern(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Format: HASH-DATE (visible sur le contenu fuité)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortId">OU ID court (8 caractères)</Label>
                <Input
                  id="shortId"
                  placeholder="ex: a1b2c3d4"
                  value={shortId}
                  onChange={(e) => setShortId(e.target.value)}
                  maxLength={8}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Les 8 premiers caractères de l'UUID utilisateur
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={investigate} 
                disabled={loading || (!watermarkPattern && !shortId)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {loading ? 'Recherche...' : 'Investiguer'}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={loading}>
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Résultats de l'investigation */}
        {result && (
          <Card className={result.success ? 'border-green-500/50' : 'border-destructive/50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <Shield className="h-5 w-5 text-green-500" />
                    Utilisateur identifié
                    {result.userId && getUserLeakCount(result.userId) > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {getUserLeakCount(result.userId)} fuite(s) précédente(s)
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Investigation échouée
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div className="space-y-6">
                  {/* Informations utilisateur */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Utilisateur</p>
                          <p className="font-medium">{result.displayName || result.username || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{result.userEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Fingerprint className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">User ID</p>
                          <p className="font-mono text-sm">{result.userId}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date approximative de la fuite</p>
                          <p className="font-medium">
                            {result.leakTimestamp 
                              ? new Date(result.leakTimestamp).toLocaleString('fr-FR')
                              : 'Inconnue'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pattern détecté</p>
                          <p className="font-mono text-sm">{result.watermarkPattern || result.shortId}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Abonnements actifs */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Abonnements de l'utilisateur
                    </h4>
                    
                    {result.subscriptions && result.subscriptions.length > 0 ? (
                      <div className="space-y-2">
                        {result.subscriptions.map((sub, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{sub.creator_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Depuis le {new Date(sub.start_date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                              {sub.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucun abonnement trouvé</p>
                    )}
                  </div>

                  <Separator />

                  {/* Formulaire d'enregistrement de la fuite */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Enregistrer cette fuite
                    </h4>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sourceUrl">URL de la source (optionnel)</Label>
                        <Input
                          id="sourceUrl"
                          placeholder="https://..."
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optionnel)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Ajoutez des notes sur cette fuite..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={saveLeak} 
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Enregistrement...' : 'Enregistrer la fuite'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Aucun utilisateur trouvé</p>
                  <p className="text-muted-foreground">
                    {result.error || 'Le pattern de watermark ne correspond à aucun utilisateur enregistré.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Guide d'utilisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comment utiliser cette fonctionnalité</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>1.</strong> Lorsqu'un contenu fuit sur Internet, localisez le watermark forensique 
              visible en filigrane semi-transparent sur l'image/vidéo.
            </p>
            <p>
              <strong>2.</strong> Le watermark contient un pattern de 8 caractères (ID court) suivi 
              optionnellement d'un timestamp. Exemple: <code className="bg-muted px-1 rounded">a1b2c3d4-20241208143022</code>
            </p>
            <p>
              <strong>3.</strong> Entrez ce pattern dans le champ ci-dessus et cliquez sur "Investiguer" 
              pour identifier l'utilisateur qui a accédé à ce contenu.
            </p>
            <p>
              <strong>4.</strong> Une fois identifié, enregistrez la fuite pour le suivi. Les récidivistes 
              seront automatiquement détectés.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Onglet Historique */}
      <TabsContent value="history">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Historique des fuites détectées</CardTitle>
              <CardDescription>
                Toutes les fuites de contenu enregistrées
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loadingHistory}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {leakHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune fuite enregistrée pour le moment
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leakHistory.map((leak) => (
                    <TableRow key={leak.id}>
                      <TableCell>
                        {new Date(leak.detected_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {leak.short_id}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {leak.source_url || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(leak.status)}>
                          {leak.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {leak.status === 'detected' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateLeakStatus(leak.id, 'warned', 'Avertissement envoyé')}
                              >
                                Avertir
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openSuspendDialog(getLeakUserInfo(leak))}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Suspendre
                              </Button>
                            </>
                          )}
                          {leak.status === 'warned' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openSuspendDialog(getLeakUserInfo(leak))}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Suspendre
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Onglet Récidivistes */}
      <TabsContent value="recidivists">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Utilisateurs récidivistes
            </CardTitle>
            <CardDescription>
              Utilisateurs impliqués dans plusieurs fuites de contenu (minimum 2)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recidivists.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun récidiviste détecté
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Nombre de fuites</TableHead>
                    <TableHead>Première fuite</TableHead>
                    <TableHead>Dernière fuite</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recidivists.map((recidivist) => (
                    <TableRow key={recidivist.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recidivist.username || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{recidivist.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{recidivist.leak_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(recidivist.first_leak).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {new Date(recidivist.last_leak).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => openSuspendDialog({
                            userId: recidivist.user_id,
                            username: recidivist.username,
                            email: recidivist.user_email,
                          })}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Suspendre
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialogue de confirmation de suspension */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Confirmer la suspension
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Vous êtes sur le point de suspendre le compte de{' '}
                <strong>{suspensionTarget?.username || suspensionTarget?.email}</strong>.
              </p>
              <p className="text-destructive">
                Cette action empêchera l'utilisateur d'accéder à la plateforme.
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="suspensionReason">Raison de la suspension</Label>
                <Textarea
                  id="suspensionReason"
                  placeholder="Indiquez la raison de la suspension..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuspension}
              disabled={suspending || !suspensionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {suspending ? 'Suspension...' : 'Confirmer la suspension'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
};

export default WatermarkInvestigation;
