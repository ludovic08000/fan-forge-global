import { useState } from 'react';
import { ReferralCode, ReferralSubscription, usePartnerships } from '@/hooks/usePartnerships';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, Copy, Link2, Trash2, Users, Euro, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReferralCodesManagerProps {
  creatorId: string;
  codes: ReferralCode[];
  subscriptions: ReferralSubscription[];
}

export const ReferralCodesManager = ({
  creatorId,
  codes,
  subscriptions,
}: ReferralCodesManagerProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [deleteCodeId, setDeleteCodeId] = useState<string | null>(null);

  const { createReferralCode, toggleReferralCode, deleteReferralCode, isCreatingCode } =
    usePartnerships(creatorId);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = () => {
    if (!newCode || newCode.length < 4) {
      toast.error('Le code doit contenir au moins 4 caractères');
      return;
    }

    createReferralCode({
      code: newCode,
      commissionRate,
    });

    setCreateOpen(false);
    setNewCode('');
    setCommissionRate(10);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié !');
  };

  const handleDeleteCode = () => {
    if (deleteCodeId) {
      deleteReferralCode(deleteCodeId);
      setDeleteCodeId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Code Button */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Créer un code
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau code d'affiliation</DialogTitle>
            <DialogDescription>
              Créez un code unique que d'autres créateurs pourront utiliser pour recommander
              des abonnés
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code d'affiliation</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="MONCODE2024"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
                <Button variant="outline" onClick={generateRandomCode}>
                  Générer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                4-20 caractères, lettres et chiffres uniquement
              </p>
            </div>

            <div className="space-y-3">
              <Label>Taux de commission: {commissionRate}%</Label>
              <Slider
                value={[commissionRate]}
                onValueChange={(value) => setCommissionRate(value[0])}
                min={1}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Vous gagnerez {commissionRate}% de commission sur chaque abonnement généré via ce code
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCode} disabled={isCreatingCode}>
              {isCreatingCode ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Créer le code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun code d'affiliation</p>
          <p className="text-sm">Créez votre premier code pour commencer à gagner des commissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map((code) => (
            <Card key={code.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Link2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {code.is_active ? (
                          <Badge className="bg-green-500">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {code.uses_count} utilisation{code.uses_count > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {Number(code.total_earnings).toFixed(2)}€ gagnés
                        </span>
                        <span>Commission: {code.commission_rate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${code.id}`} className="text-sm">
                        Actif
                      </Label>
                      <Switch
                        id={`active-${code.id}`}
                        checked={code.is_active}
                        onCheckedChange={(checked) =>
                          toggleReferralCode({ codeId: code.id, isActive: checked })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteCodeId(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Referrals */}
      {subscriptions.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4">Parrainages récents</h3>
          <div className="space-y-2">
            {subscriptions.slice(0, 10).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <span className="text-sm">
                  Nouvel abonné via votre code
                </span>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">+{Number(sub.commission_paid).toFixed(2)}€</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(sub.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCodeId} onOpenChange={() => setDeleteCodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le code ne sera plus utilisable et vous ne recevrez
              plus de commissions pour les nouveaux abonnements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
