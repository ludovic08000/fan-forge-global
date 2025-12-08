/**
 * Interface d'investigation des watermarks forensiques
 * Permet aux admins d'identifier l'utilisateur source d'une fuite de contenu
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { 
  Search, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Fingerprint,
  Clock,
  CreditCard
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

const WatermarkInvestigation = () => {
  const [watermarkPattern, setWatermarkPattern] = useState('');
  const [shortId, setShortId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);

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
   * Réinitialiser le formulaire
   */
  const resetForm = () => {
    setWatermarkPattern('');
    setShortId('');
    setResult(null);
  };

  return (
    <div className="space-y-6">
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
            {/* Pattern complet */}
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
                Format: HASH-DATE (visible sur le contenu fuite)
              </p>
            </div>

            {/* ID court */}
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

                {/* Actions recommandées */}
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    Actions recommandées
                  </h4>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• Vérifier l'historique de connexion de cet utilisateur</li>
                    <li>• Contacter l'utilisateur pour clarification</li>
                    <li>• Envisager une suspension temporaire si récidive</li>
                    <li>• Notifier le créateur concerné par la fuite</li>
                  </ul>
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
            <strong>4.</strong> L'utilisateur identifié est celui qui a visualisé le contenu premium 
            avec son compte, permettant de tracer la source de la fuite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatermarkInvestigation;
