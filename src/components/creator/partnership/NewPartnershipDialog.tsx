/**
 * Dialog pour créer un nouveau partenariat
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { 
  Search, UserPlus, X, Percent, MessageCircle, BadgeCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CollaborationType } from '@/types/partnership';
import { COLLABORATION_TYPES, type CreatorSearchResult } from './types';

interface NewPartnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCreatorId: string | undefined;
  onSubmit: (data: {
    partnerId: string;
    revenueShareRequester: number;
    revenueSharePartner: number;
    message?: string;
    collaborationType: CollaborationType[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

const CreatorSearchItem = memo<{
  creator: CreatorSearchResult;
  onSelect: (creator: CreatorSearchResult) => void;
}>(({ creator, onSelect }) => {
  const handleClick = useCallback(() => onSelect(creator), [creator, onSelect]);
  const initial = (creator.stage_name || creator.username || '?')[0].toUpperCase();
  
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={creator.avatar_url || undefined} />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {creator.stage_name || creator.display_name || creator.username}
          </span>
          {creator.is_verified && (
            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {creator.total_subscribers} abonnés
        </p>
      </div>
    </button>
  );
});
CreatorSearchItem.displayName = 'CreatorSearchItem';

const SelectedCreatorCard = memo<{
  creator: CreatorSearchResult;
  onClear: () => void;
}>(({ creator, onClear }) => {
  const initial = (creator.stage_name || creator.username || '?')[0].toUpperCase();
  
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={creator.avatar_url || undefined} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {creator.stage_name || creator.display_name || creator.username}
            </span>
            {creator.is_verified && (
              <BadgeCheck className="h-4 w-4 text-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {creator.total_subscribers} abonnés
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
});
SelectedCreatorCard.displayName = 'SelectedCreatorCard';

const CollaborationTypeSelector = memo<{
  selected: CollaborationType[];
  onChange: (types: CollaborationType[]) => void;
}>(({ selected, onChange }) => {
  const handleChange = useCallback((type: CollaborationType, checked: boolean) => {
    if (checked) {
      onChange([...selected, type]);
    } else {
      onChange(selected.filter(t => t !== type));
    }
  }, [selected, onChange]);

  return (
    <div className="space-y-3">
      <Label>Types de collaboration</Label>
      <div className="grid grid-cols-2 gap-3">
        {COLLABORATION_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected.includes(type.value)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Checkbox
              checked={selected.includes(type.value)}
              onCheckedChange={(checked) => handleChange(type.value, !!checked)}
            />
            <div>
              <p className="font-medium text-sm">{type.label}</p>
              <p className="text-xs text-muted-foreground">{type.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
});
CollaborationTypeSelector.displayName = 'CollaborationTypeSelector';

const NewPartnershipDialog = memo<NewPartnershipDialogProps>(({
  open,
  onOpenChange,
  currentCreatorId,
  onSubmit,
  isSubmitting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorSearchResult | null>(null);
  const [revenueShare, setRevenueShare] = useState(50);
  const [message, setMessage] = useState('');
  const [collaborationTypes, setCollaborationTypes] = useState<CollaborationType[]>(['content']);

  // Recherche de créateurs avec debounce implicite via staleTime
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-creators-partnership', searchQuery, currentCreatorId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2 || !currentCreatorId) return [];
      
      const { data, error } = await supabase
        .from('creators')
        .select(`
          id, 
          stage_name, 
          user_id, 
          total_subscribers,
          profiles:user_id(avatar_url, username, display_name, is_verified)
        `)
        .neq('id', currentCreatorId)
        .eq('is_paused', false)
        .or(`stage_name.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      
      return data.map((c: any) => ({
        id: c.id,
        stage_name: c.stage_name,
        user_id: c.user_id,
        total_subscribers: c.total_subscribers || 0,
        avatar_url: c.profiles?.avatar_url,
        username: c.profiles?.username,
        display_name: c.profiles?.display_name,
        is_verified: c.profiles?.is_verified || false,
      })) as CreatorSearchResult[];
    },
    enabled: searchQuery.length >= 2 && open && !!currentCreatorId,
    staleTime: 30 * 1000, // Cache 30s pour éviter re-fetch inutiles
  });

  const handleSelectCreator = useCallback((creator: CreatorSearchResult) => {
    setSelectedCreator(creator);
    setSearchQuery('');
  }, []);

  const handleClearCreator = useCallback(() => {
    setSelectedCreator(null);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    setRevenueShare(value[0]);
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCreator) return;
    
    await onSubmit({
      partnerId: selectedCreator.id,
      revenueShareRequester: revenueShare,
      revenueSharePartner: 100 - revenueShare,
      message: message || undefined,
      collaborationType: collaborationTypes,
    });
    
    // Reset form
    setSelectedCreator(null);
    setSearchQuery('');
    setRevenueShare(50);
    setMessage('');
    setCollaborationTypes(['content']);
  }, [selectedCreator, revenueShare, message, collaborationTypes, onSubmit]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const isSubmitDisabled = !selectedCreator || collaborationTypes.length === 0 || isSubmitting;

  const showSearchResults = useMemo(() => 
    searchResults && searchResults.length > 0 && !selectedCreator,
    [searchResults, selectedCreator]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Proposer un partenariat
          </DialogTitle>
          <DialogDescription>
            Recherchez un créateur et définissez les termes de votre collaboration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Recherche de créateur */}
          <div className="space-y-2">
            <Label>Rechercher un créateur</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom ou pseudo du créateur..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            
            {searchLoading && (
              <div className="p-4 text-center text-muted-foreground">
                Recherche...
              </div>
            )}
            
            {showSearchResults && (
              <ScrollArea className="h-48 border rounded-lg">
                {searchResults!.map((creator) => (
                  <CreatorSearchItem
                    key={creator.id}
                    creator={creator}
                    onSelect={handleSelectCreator}
                  />
                ))}
              </ScrollArea>
            )}
            
            {selectedCreator && (
              <SelectedCreatorCard
                creator={selectedCreator}
                onClear={handleClearCreator}
              />
            )}
          </div>

          {/* Types de collaboration */}
          <CollaborationTypeSelector
            selected={collaborationTypes}
            onChange={setCollaborationTypes}
          />

          {/* Partage des revenus */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Partage des revenus
            </Label>
            <div className="space-y-4">
              <Slider
                value={[revenueShare]}
                onValueChange={handleSliderChange}
                max={100}
                min={0}
                step={5}
              />
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <p className="font-bold text-lg text-primary">{revenueShare}%</p>
                  <p className="text-muted-foreground">Vous</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{100 - revenueShare}%</p>
                  <p className="text-muted-foreground">Partenaire</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Message (optionnel)
            </Label>
            <Textarea
              placeholder="Présentez votre proposition de collaboration..."
              value={message}
              onChange={handleMessageChange}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

NewPartnershipDialog.displayName = 'NewPartnershipDialog';

export default NewPartnershipDialog;
