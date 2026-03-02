import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreateBundleDialog } from './CreateBundleDialog';

interface CreatorBundlesSectionProps {
  creatorId: string;
}

export const CreatorBundlesSection: React.FC<CreatorBundlesSectionProps> = ({ creatorId }) => {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['creator-bundles', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_bundles')
        .select('*, bundle_items(id, content:content(id, title, content_type))')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = async (bundleId: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('content_bundles')
      .update({ status: newStatus })
      .eq('id', bundleId);
    if (error) toast.error(error.message);
    else {
      toast.success(newStatus === 'active' ? 'Bundle activé' : 'Bundle désactivé');
      queryClient.invalidateQueries({ queryKey: ['creator-bundles'] });
    }
  };

  const deleteBundle = async (bundleId: string) => {
    if (!confirm('Supprimer ce bundle ?')) return;
    const { error } = await supabase.from('content_bundles').delete().eq('id', bundleId);
    if (error) toast.error(error.message);
    else {
      toast.success('Bundle supprimé');
      queryClient.invalidateQueries({ queryKey: ['creator-bundles'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Bundles & Packs
          </h2>
          <p className="text-sm text-muted-foreground">Créez des packs groupés à prix réduit</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau bundle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !bundles?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucun bundle</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez un pack de contenus groupés pour augmenter vos ventes
            </p>
            <Button onClick={() => setShowCreate(true)}>Créer mon premier bundle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bundles.map((bundle: any) => (
            <Card key={bundle.id} className={bundle.status !== 'active' ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{bundle.title}</CardTitle>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground mt-1">{bundle.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {bundle.discount_percentage > 0 && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        -{bundle.discount_percentage}%
                      </Badge>
                    )}
                    <Badge variant={bundle.status === 'active' ? 'default' : 'secondary'}>
                      {bundle.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {bundle.bundle_items?.length || 0} contenus
                  </span>
                  <div className="flex items-center gap-2">
                    {bundle.original_price > bundle.bundle_price && (
                      <span className="text-muted-foreground line-through text-xs">{bundle.original_price}€</span>
                    )}
                    <span className="font-bold text-primary">{bundle.bundle_price}€</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{bundle.sales_count} vente{bundle.sales_count > 1 ? 's' : ''}</span>
                  {bundle.max_sales && <span>Max: {bundle.max_sales}</span>}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(bundle.id, bundle.status)} className="flex-1 gap-1">
                    {bundle.status === 'active' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {bundle.status === 'active' ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteBundle(bundle.id)} className="gap-1">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateBundleDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        creatorId={creatorId}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['creator-bundles'] })}
      />
    </div>
  );
};

export default CreatorBundlesSection;
