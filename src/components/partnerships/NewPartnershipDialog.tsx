import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerships, PartnershipType } from '@/hooks/usePartnerships';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Users, Loader2 } from 'lucide-react';

interface NewPartnershipDialogProps {
  creatorId: string;
  type: PartnershipType;
}

export const NewPartnershipDialog = ({
  creatorId,
  type,
}: NewPartnershipDialogProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<{
    id: string;
    stage_name: string;
    avatar_url?: string;
    user_id?: string;
  } | null>(null);
  const [revenueShare, setRevenueShare] = useState(50);
  const [message, setMessage] = useState('');

  const { createPartnership, isCreatingPartnership } = usePartnerships(creatorId);

  // Search creators
  const { data: creators = [], isLoading: searchLoading } = useQuery({
    queryKey: ['search-creators', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const { data, error } = await supabase
        .from('creators')
        .select(`
          id,
          stage_name,
          user_id
        `)
        .neq('id', creatorId)
        .ilike('stage_name', `%${search}%`)
        .limit(10);

      if (error) throw error;

      // Fetch profiles for avatars
      const userIds = data?.map((c) => c.user_id).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.avatar_url]) || []);

        return data?.map((c) => ({
          id: c.id,
          stage_name: c.stage_name,
          user_id: c.user_id,
          avatar_url: profileMap.get(c.user_id) as string | undefined,
        })) || [];
      }

      return data?.map(c => ({
        id: c.id,
        stage_name: c.stage_name,
        user_id: c.user_id,
        avatar_url: undefined as string | undefined,
      })) || [];
    },
    enabled: search.length >= 2,
  });

  const handleSubmit = () => {
    if (!selectedCreator) return;

    createPartnership({
      partnerId: selectedCreator.id,
      type,
      shareRequester: revenueShare,
      sharePartner: 100 - revenueShare,
      message: message || undefined,
    });

    setOpen(false);
    setSelectedCreator(null);
    setSearch('');
    setRevenueShare(50);
    setMessage('');
  };

  const typeLabels = {
    collaboration: 'collaboration',
    permanent: 'partenariat',
    affiliation: 'affiliation',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau {typeLabels[type]}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Créer un {typeLabels[type]}
          </DialogTitle>
          <DialogDescription>
            {type === 'collaboration' &&
              'Proposez une collaboration ponctuelle sur un contenu spécifique.'}
            {type === 'permanent' &&
              'Créez un partenariat durable avec partage des revenus.'}
            {type === 'affiliation' &&
              'Invitez un créateur à rejoindre votre programme d\'affiliation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Rechercher un créateur</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom du créateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {creators.length > 0 && !selectedCreator && (
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {creators.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => setSelectedCreator(creator)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={creator.avatar_url} />
                        <AvatarFallback>
                          {creator.stage_name?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{creator.stage_name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected creator */}
          {selectedCreator && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedCreator.avatar_url} />
                <AvatarFallback>
                  {selectedCreator.stage_name?.[0]?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{selectedCreator.stage_name}</p>
                <p className="text-sm text-muted-foreground">Créateur sélectionné</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCreator(null)}
              >
                Changer
              </Button>
            </div>
          )}

          {/* Revenue share */}
          <div className="space-y-3">
            <Label>Partage des revenus</Label>
            <div className="px-2">
              <Slider
                value={[revenueShare]}
                onValueChange={(value) => setRevenueShare(value[0])}
                min={10}
                max={90}
                step={5}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-primary">Vous: {revenueShare}%</span>
              <span className="text-muted-foreground">Partenaire: {100 - revenueShare}%</span>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message (optionnel)</Label>
            <Textarea
              placeholder="Ajoutez un message pour votre demande..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCreator || isCreatingPartnership}
          >
            {isCreatingPartnership ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Envoyer la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
