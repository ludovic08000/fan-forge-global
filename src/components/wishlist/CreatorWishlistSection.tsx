import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreatorWishlistSectionProps {
  creatorId: string;
}

export const CreatorWishlistSection: React.FC<CreatorWishlistSectionProps> = ({ creatorId }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [reward, setReward] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ['creator-wishlists', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_wishlists')
        .select('*, wishlist_contributions(id, amount, status)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = async () => {
    if (!title || !goalAmount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('creator_wishlists').insert({
        creator_id: creatorId,
        title: title.trim(),
        description: description.trim() || null,
        goal_amount: parseFloat(goalAmount),
        reward_description: reward.trim() || null,
      });
      if (error) throw error;
      toast.success('Projet créé !');
      setTitle(''); setDescription(''); setGoalAmount(''); setReward('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['creator-wishlists'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteWishlist = async (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return;
    await supabase.from('creator_wishlists').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['creator-wishlists'] });
    toast.success('Supprimé');
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'completed' : 'active';
    await supabase.from('creator_wishlists').update({ status: newStatus }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['creator-wishlists'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Wishlist & Crowdfunding
          </h2>
          <p className="text-sm text-muted-foreground">Vos fans financent vos projets</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau projet
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !wishlists?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucun projet</h3>
            <p className="text-sm text-muted-foreground mb-4">Créez un projet que vos fans peuvent financer</p>
            <Button onClick={() => setShowCreate(true)}>Créer mon premier projet</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {wishlists.map((w: any) => {
            const paidContribs = w.wishlist_contributions?.filter((c: any) => c.status === 'paid') || [];
            const totalRaised = paidContribs.reduce((s: number, c: any) => s + Number(c.amount), 0);
            const progress = w.goal_amount > 0 ? Math.min(100, (totalRaised / w.goal_amount) * 100) : 0;

            return (
              <Card key={w.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{w.title}</CardTitle>
                    <Badge variant={w.status === 'active' ? 'default' : 'secondary'}>{w.status}</Badge>
                  </div>
                  {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{totalRaised.toFixed(2)}€ / {w.goal_amount}€</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">{paidContribs.length} contribution(s)</p>
                  {w.reward_description && (
                    <p className="text-xs text-muted-foreground">🎁 {w.reward_description}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleStatus(w.id, w.status)}>
                      {w.status === 'active' ? 'Terminer' : 'Réactiver'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteWishlist(w.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Créez un objectif de financement pour vos fans</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Titre</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Nouveau setup streaming" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez votre projet..." rows={2} /></div>
            <div><Label>Objectif (€)</Label><Input type="number" min="1" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="500" /></div>
            <div><Label>Contrepartie (optionnel)</Label><Input value={reward} onChange={e => setReward(e.target.value)} placeholder="Ex: Contenu exclusif pour les contributeurs" /></div>
            <Button onClick={handleCreate} disabled={saving || !title || !goalAmount} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer le projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorWishlistSection;
