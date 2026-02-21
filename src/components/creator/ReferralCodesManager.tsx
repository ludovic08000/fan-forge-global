import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Plus, Copy, Trash2, Users, Percent, Euro, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReferralCode {
  id: string;
  code: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface ReferralCodesManagerProps {
  creatorId: string;
}

const ReferralCodesManager: React.FC<ReferralCodesManagerProps> = ({ creatorId }) => {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'amount' | 'free',
    discountValue: '',
    maxUses: '',
    expiresAt: '',
    duration: '1' as string // Durée en mois (1 = premier mois, 2 = 2 premiers mois, etc.)
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCodes();
  }, [creatorId]);

  const loadCodes = async () => {
    try {
      // First, cleanup expired codes
      await supabase.functions.invoke('cleanup-expired-codes');
      
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out expired codes locally as well (in case cleanup hasn't run yet)
      const now = new Date();
      const validCodes = (data || []).filter(code => {
        if (!code.expires_at) return true;
        return new Date(code.expires_at) > now;
      });
      
      setCodes(validCodes);
    } catch (error) {
      console.error('Error loading referral codes:', error);
      toast.error('Erreur lors du chargement des codes');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code }));
  };

  const handleCreateCode = async () => {
    if (!newCode.code.trim()) {
      toast.error('Veuillez entrer un code');
      return;
    }

    // Validation selon le type
    if (newCode.discountType !== 'free' && (!newCode.discountValue || parseFloat(newCode.discountValue) <= 0)) {
      toast.error('Veuillez entrer une réduction valide');
      return;
    }

    setCreating(true);

    try {
      const codeData: any = {
        creator_id: creatorId,
        code: newCode.code.toUpperCase().trim(),
        is_active: true,
        current_uses: 0
      };

      if (newCode.discountType === 'free') {
        // Gratuit = 100% de réduction
        codeData.discount_percentage = 100;
        codeData.discount_amount = 0;
      } else if (newCode.discountType === 'percentage') {
        codeData.discount_percentage = parseInt(newCode.discountValue);
        codeData.discount_amount = 0;
      } else {
        codeData.discount_amount = parseFloat(newCode.discountValue);
        codeData.discount_percentage = 0;
      }

      // Durée de la réduction (max 2 mois)
      const durationMonths = Math.min(parseInt(newCode.duration) || 1, 2);
      codeData.duration_months = durationMonths;

      if (newCode.maxUses) {
        codeData.max_uses = parseInt(newCode.maxUses);
      }

      if (newCode.expiresAt) {
        codeData.expires_at = new Date(newCode.expiresAt).toISOString();
      }

      const { error } = await supabase
        .from('referral_codes')
        .insert(codeData);

      if (error) throw error;

      toast.success('Code promo créé avec succès !');
      setIsDialogOpen(false);
      setNewCode({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        maxUses: '',
        expiresAt: '',
        duration: '1'
      });
      loadCodes();
    } catch (error: any) {
      console.error('Error creating code:', error);
      if (error.code === '23505') {
        toast.error('Ce code existe déjà');
      } else {
        toast.error('Erreur lors de la création du code');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('referral_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) throw error;

      setCodes(prev => prev.map(c => 
        c.id === codeId ? { ...c, is_active: !currentStatus } : c
      ));
      toast.success(currentStatus ? 'Code désactivé' : 'Code activé');
    } catch (error) {
      console.error('Error toggling code:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) return;

    try {
      const { error } = await supabase
        .from('referral_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      setCodes(prev => prev.filter(c => c.id !== codeId));
      toast.success('Code supprimé');
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié !');
  };

  const formatDiscount = (code: ReferralCode) => {
    if (code.discount_percentage === 100) {
      return 'GRATUIT';
    }
    if (code.discount_percentage && code.discount_percentage > 0) {
      return `-${code.discount_percentage}%`;
    }
    if (code.discount_amount && code.discount_amount > 0) {
      return `-${code.discount_amount.toFixed(2)} €`;
    }
    return '-';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Codes promo & Parrainage
            </CardTitle>
            <CardDescription>
              Créez des codes promotionnels pour attirer de nouveaux abonnés
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            // Générer automatiquement un code à l'ouverture
            if (open && !newCode.code) {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              let code = '';
              for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              setNewCode(prev => ({ ...prev, code }));
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="premium" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un code promo</DialogTitle>
                <DialogDescription>
                  Créez un code de réduction pour vos nouveaux abonnés
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Code promo</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCode.code}
                      onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="Ex: PROMO2024"
                      className="uppercase font-mono"
                    />
                    <Button variant="outline" onClick={generateRandomCode} title="Générer un code aléatoire">
                      <Gift className="h-4 w-4 mr-2" />
                      Générer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Un code a été généré automatiquement. Vous pouvez le modifier.</p>
                </div>

                <div className="space-y-2">
                  <Label>Type de réduction</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={newCode.discountType === 'free' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCode(prev => ({ ...prev, discountType: 'free', discountValue: '100' }))}
                      className="flex-1"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Gratuit
                    </Button>
                    <Button
                      variant={newCode.discountType === 'percentage' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCode(prev => ({ ...prev, discountType: 'percentage', discountValue: '' }))}
                      className="flex-1"
                    >
                      <Percent className="h-4 w-4 mr-2" />
                      %
                    </Button>
                    <Button
                      variant={newCode.discountType === 'amount' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCode(prev => ({ ...prev, discountType: 'amount', discountValue: '' }))}
                      className="flex-1"
                    >
                      <Euro className="h-4 w-4 mr-2" />
                      €
                    </Button>
                  </div>
                </div>

                {newCode.discountType !== 'free' && (
                  <div className="space-y-2">
                    <Label>
                      {newCode.discountType === 'percentage' ? 'Réduction (%)' : 'Réduction (€)'}
                    </Label>
                    <Input
                      type="number"
                      value={newCode.discountValue}
                      onChange={(e) => setNewCode(prev => ({ ...prev, discountValue: e.target.value }))}
                      placeholder={newCode.discountType === 'percentage' ? 'Ex: 20' : 'Ex: 5.00'}
                      min="1"
                      max={newCode.discountType === 'percentage' ? '100' : undefined}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Durée de la réduction (max 2 mois)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['1', '2'].map((d) => (
                      <Button
                        key={d}
                        variant={newCode.duration === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewCode(prev => ({ ...prev, duration: d }))}
                      >
                        {d === '1' ? '1 mois' : `${d} mois`}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {`La réduction s'applique au${parseInt(newCode.duration) > 1 ? 'x' : ''} ${newCode.duration} premier${parseInt(newCode.duration) > 1 ? 's' : ''} mois`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Utilisations max (optionnel)</Label>
                    <Input
                      type="number"
                      value={newCode.maxUses}
                      onChange={(e) => setNewCode(prev => ({ ...prev, maxUses: e.target.value }))}
                      placeholder="Illimité"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration du code (optionnel)</Label>
                    <Input
                      type="date"
                      value={newCode.expiresAt}
                      onChange={(e) => setNewCode(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateCode} disabled={creating} className="w-full">
                  {creating ? 'Création...' : 'Créer le code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun code promo créé</p>
            <p className="text-sm">Créez votre premier code pour attirer des abonnés</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Réduction</TableHead>
                <TableHead>Utilisations</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-muted px-2 py-1 rounded text-sm">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatDiscount(code)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {code.current_uses}
                      {code.max_uses && ` / ${code.max_uses}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.expires_at ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(code.expires_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={() => handleToggleActive(code.id, code.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteCode(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCodesManager;