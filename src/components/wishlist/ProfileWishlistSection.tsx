import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileWishlistSectionProps {
  creatorId: string;
}

export const ProfileWishlistSection: React.FC<ProfileWishlistSectionProps> = ({ creatorId }) => {
  const { user } = useAuth();
  const [contributing, setContributing] = useState<string | null>(null);
  const [amount, setAmount] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ['profile-wishlists', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_wishlists')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleContribute = async () => {
    if (!user || !contributing || !amount) {
      toast.info('Connectez-vous pour contribuer');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-wishlist-contribution', {
        body: { wishlistId: contributing, amount: parseFloat(amount) },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
      setContributing(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !wishlists?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Gift className="h-5 w-5" /> Projets à soutenir
      </h3>
      <div className="grid gap-3">
        {wishlists.map((w: any) => {
          const progress = w.goal_amount > 0 ? Math.min(100, (w.current_amount / w.goal_amount) * 100) : 0;
          return (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{w.title}</h4>
                    {w.description && <p className="text-sm text-muted-foreground line-clamp-2">{w.description}</p>}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{w.current_amount}€ / {w.goal_amount}€</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    {w.reward_description && (
                      <p className="text-xs text-muted-foreground mt-1">🎁 {w.reward_description}</p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => setContributing(w.id)} className="gap-1 shrink-0">
                    <Heart className="h-3 w-3" /> Soutenir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!contributing} onOpenChange={() => setContributing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Contribuer au projet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[5, 10, 25, 50].map(v => (
                <Button key={v} size="sm" variant={amount === String(v) ? 'default' : 'outline'} onClick={() => setAmount(String(v))}>
                  {v}€
                </Button>
              ))}
            </div>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant libre" />
            <Button onClick={handleContribute} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Contribuer {amount}€
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileWishlistSection;
