/**
 * Dialog pour créer une nouvelle enchère de contenu
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Loader2, Clock, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  onCreated: () => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 heure' },
  { value: '3', label: '3 heures' },
  { value: '6', label: '6 heures' },
  { value: '12', label: '12 heures' },
  { value: '24', label: '24 heures' },
  { value: '48', label: '48 heures' },
  { value: '72', label: '3 jours' },
  { value: '168', label: '7 jours' },
];

export const CreateAuctionDialog: React.FC<CreateAuctionDialogProps> = ({
  open, onOpenChange, creatorId, onCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('5');
  const [minIncrement, setMinIncrement] = useState('1');
  const [durationHours, setDurationHours] = useState('24');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Titre requis');
      return;
    }
    const price = parseFloat(startingPrice);
    const increment = parseFloat(minIncrement);
    if (isNaN(price) || price < 1) {
      toast.error('Prix minimum: 1€');
      return;
    }
    if (isNaN(increment) || increment < 0.5) {
      toast.error('Incrément minimum: 0.50€');
      return;
    }

    setLoading(true);
    try {
      const hours = parseInt(durationHours);
      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('content_auctions').insert({
        creator_id: creatorId,
        title: title.trim(),
        description: description.trim() || null,
        starting_price: price,
        current_price: price,
        min_increment: increment,
        ends_at: endsAt,
        status: 'active',
      });

      if (error) throw error;
      toast.success('Enchère créée ! 🔥');
      onCreated();
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setStartingPrice('5');
      setMinIncrement('1');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Nouvelle enchère
          </DialogTitle>
          <DialogDescription>
            Mettez un contenu exclusif aux enchères. Le plus offrant gagnera l'accès.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre de l'enchère *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Shooting exclusif backstage"
              maxLength={100}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez le contenu exclusif que le gagnant recevra..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" />
                Prix de départ
              </Label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={startingPrice}
                onChange={e => setStartingPrice(e.target.value)}
              />
            </div>
            <div>
              <Label>Incrément minimum</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={minIncrement}
                onChange={e => setMinIncrement(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Durée de l'enchère
            </Label>
            <Select value={durationHours} onValueChange={setDurationHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
            Lancer l'enchère
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAuctionDialog;
