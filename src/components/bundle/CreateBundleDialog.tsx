import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ImageIcon, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  price: number | null;
  thumbnail_url: string | null;
}

interface CreateBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  onCreated: () => void;
}

export const CreateBundleDialog: React.FC<CreateBundleDialogProps> = ({
  open, onOpenChange, creatorId, onCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [maxSales, setMaxSales] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && creatorId) {
      setLoading(true);
      supabase
        .from('content')
        .select('id, title, content_type, price, thumbnail_url')
        .eq('creator_id', creatorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setContent(data || []);
          setLoading(false);
        });
    }
  }, [open, creatorId]);

  const originalPrice = selectedIds.reduce((sum, id) => {
    const item = content.find(c => c.id === id);
    return sum + (item?.price || 0);
  }, 0);

  const discount = originalPrice > 0 && parseFloat(bundlePrice) > 0
    ? Math.round((1 - parseFloat(bundlePrice) / originalPrice) * 100)
    : 0;

  const toggleItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!title.trim() || selectedIds.length < 2 || !bundlePrice) {
      toast.error('Remplissez tous les champs et sélectionnez au moins 2 contenus');
      return;
    }

    setSaving(true);
    try {
      const { data: bundle, error } = await supabase
        .from('content_bundles')
        .insert({
          creator_id: creatorId,
          title: title.trim(),
          description: description.trim() || null,
          original_price: originalPrice,
          bundle_price: parseFloat(bundlePrice),
          discount_percentage: Math.max(0, discount),
          max_sales: maxSales ? parseInt(maxSales) : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      const items = selectedIds.map(content_id => ({
        bundle_id: bundle.id,
        content_id,
      }));

      const { error: itemsError } = await supabase
        .from('bundle_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success('Bundle créé !');
      setTitle('');
      setDescription('');
      setBundlePrice('');
      setMaxSales('');
      setSelectedIds([]);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Créer un Bundle
          </DialogTitle>
          <DialogDescription>
            Regroupez des contenus à prix réduit pour vos abonnés
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre du bundle</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pack été 2026" />
          </div>

          <div>
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez votre bundle..." rows={2} />
          </div>

          <div>
            <Label>Sélectionnez les contenus ({selectedIds.length} sélectionnés)</Label>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {content.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedIds.includes(item.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.content_type === 'video' ? (
                        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm truncate">{item.title}</span>
                    </div>
                    {item.price && item.price > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">{item.price}€</Badge>
                    )}
                  </label>
                ))}
                {content.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    Aucun contenu publié disponible
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix du bundle (€)</Label>
              <Input type="number" min="0" step="0.01" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="9.99" />
            </div>
            <div>
              <Label>Ventes max (optionnel)</Label>
              <Input type="number" min="1" value={maxSales} onChange={e => setMaxSales(e.target.value)} placeholder="Illimité" />
            </div>
          </div>

          {originalPrice > 0 && parseFloat(bundlePrice) > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix unitaires cumulés</span>
                <span className="line-through">{originalPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Prix du bundle</span>
                <span className="text-primary">{parseFloat(bundlePrice).toFixed(2)}€</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Réduction</span>
                  <span>-{discount}%</span>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleCreate} disabled={saving || selectedIds.length < 2 || !title || !bundlePrice} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
            Créer le bundle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBundleDialog;
