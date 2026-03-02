import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileBundlesSectionProps {
  creatorId: string;
}

export const ProfileBundlesSection: React.FC<ProfileBundlesSectionProps> = ({ creatorId }) => {
  const { user } = useAuth();

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['profile-bundles', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_bundles')
        .select('*, bundle_items(id, content:content(id, title, content_type, thumbnail_url))')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['my-bundle-purchases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('bundle_purchases')
        .select('bundle_id')
        .eq('buyer_id', user!.id)
        .eq('status', 'paid');
      return data?.map(p => p.bundle_id) || [];
    },
  });

  const handleBuy = async (bundleId: string) => {
    if (!user) {
      toast.info('Connectez-vous pour acheter un bundle');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-bundle-checkout', {
        body: { bundleId },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    }
  };

  if (isLoading) return null;
  if (!bundles?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5" />
        Packs disponibles
      </h3>

      <div className="grid gap-3">
        {bundles.map((bundle: any) => {
          const owned = purchases?.includes(bundle.id);
          const soldOut = bundle.max_sales && bundle.sales_count >= bundle.max_sales;

          return (
            <Card key={bundle.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{bundle.title}</h4>
                      {bundle.discount_percentage > 0 && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                          -{bundle.discount_percentage}%
                        </Badge>
                      )}
                    </div>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{bundle.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {bundle.bundle_items?.length || 0} contenus inclus
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {bundle.original_price > bundle.bundle_price && (
                      <div className="text-xs text-muted-foreground line-through">{bundle.original_price}€</div>
                    )}
                    <div className="text-lg font-bold text-primary">{bundle.bundle_price}€</div>

                    {owned ? (
                      <Badge variant="secondary" className="mt-2">Acheté ✓</Badge>
                    ) : soldOut ? (
                      <Badge variant="destructive" className="mt-2">Épuisé</Badge>
                    ) : (
                      <Button size="sm" className="mt-2 gap-1" onClick={() => handleBuy(bundle.id)}>
                        <ShoppingCart className="h-3 w-3" />
                        Acheter
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileBundlesSection;
