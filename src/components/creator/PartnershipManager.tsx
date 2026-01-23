/**
 * Composant de gestion des partenariats entre créateurs
 */

import React, { useState } from 'react';
import { 
  Users, 
  Send, 
  Inbox, 
  Handshake, 
  Check, 
  X, 
  Clock, 
  TrendingUp,
  Plus,
  Search,
  Percent,
  MessageCircle,
  UserPlus,
  AlertCircle,
  BadgeCheck,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePartnerships } from '@/hooks/usePartnerships';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PartnershipWithProfiles, CollaborationType } from '@/types/partnership';

const COLLABORATION_TYPES: { value: CollaborationType; label: string; description: string }[] = [
  { value: 'content', label: 'Contenu commun', description: 'Créer du contenu ensemble' },
  { value: 'live', label: 'Lives collaboratifs', description: 'Faire des lives à deux' },
  { value: 'promotion', label: 'Promotion croisée', description: 'Se promouvoir mutuellement' },
  { value: 'exclusive', label: 'Exclusivités', description: 'Contenus exclusifs partagés' },
];

interface CreatorSearchResult {
  id: string;
  stage_name: string | null;
  user_id: string;
  total_subscribers: number;
  avatar_url: string | null;
  username: string | null;
  display_name: string | null;
  is_verified: boolean;
}

const PartnershipManager: React.FC = () => {
  const {
    currentCreatorId,
    isCreator,
    partnerships,
    pendingReceived,
    pendingSent,
    activePartnerships,
    isLoading,
    createPartnership,
    acceptPartnership,
    rejectPartnership,
    cancelPartnership,
    endPartnership,
  } = usePartnerships();

  const [showNewPartnership, setShowNewPartnership] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorSearchResult | null>(null);
  const [revenueShare, setRevenueShare] = useState(50);
  const [message, setMessage] = useState('');
  const [collaborationTypes, setCollaborationTypes] = useState<CollaborationType[]>(['content']);

  // Recherche de créateurs
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-creators-partnership', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
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
    enabled: searchQuery.length >= 2 && showNewPartnership,
  });

  const handleSubmitPartnership = async () => {
    if (!selectedCreator) return;
    
    await createPartnership.mutateAsync({
      partnerId: selectedCreator.id,
      revenueShareRequester: revenueShare,
      revenueSharePartner: 100 - revenueShare,
      message: message || undefined,
      collaborationType: collaborationTypes,
    });
    
    setShowNewPartnership(false);
    setSelectedCreator(null);
    setSearchQuery('');
    setRevenueShare(50);
    setMessage('');
    setCollaborationTypes(['content']);
  };

  const getPartnerInfo = (partnership: PartnershipWithProfiles) => {
    const isRequester = partnership.requesterId === currentCreatorId;
    const partner = isRequester ? partnership.partner : partnership.requester;
    return {
      isRequester,
      partner,
      myShare: isRequester ? partnership.revenueShareRequester : partnership.revenueSharePartner,
      theirShare: isRequester ? partnership.revenueSharePartner : partnership.revenueShareRequester,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case 'accepted':
        return <Badge variant="default" className="gap-1 bg-emerald-600"><Check className="h-3 w-3" /> Actif</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Refusé</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><X className="h-3 w-3" /> Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Fonctionnalité réservée aux créateurs</h3>
          <p className="text-muted-foreground">
            Vous devez avoir un profil créateur pour accéder aux partenariats.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Partenariats
          </h2>
          <p className="text-muted-foreground mt-1">
            Collaborez avec d'autres créateurs et partagez vos revenus
          </p>
        </div>
        <Dialog open={showNewPartnership} onOpenChange={setShowNewPartnership}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau partenariat
            </Button>
          </DialogTrigger>
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchLoading && (
                  <div className="p-4 text-center text-muted-foreground">
                    Recherche...
                  </div>
                )}
                
                {searchResults && searchResults.length > 0 && !selectedCreator && (
                  <ScrollArea className="h-48 border rounded-lg">
                    {searchResults.map((creator) => (
                      <button
                        key={creator.id}
                        onClick={() => {
                          setSelectedCreator(creator);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback>
                            {(creator.stage_name || creator.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
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
                    ))}
                  </ScrollArea>
                )}
                
                {selectedCreator && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedCreator.avatar_url || undefined} />
                        <AvatarFallback>
                          {(selectedCreator.stage_name || selectedCreator.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedCreator.stage_name || selectedCreator.display_name || selectedCreator.username}
                          </span>
                          {selectedCreator.is_verified && (
                            <BadgeCheck className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedCreator.total_subscribers} abonnés
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCreator(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Types de collaboration */}
              <div className="space-y-3">
                <Label>Types de collaboration</Label>
                <div className="grid grid-cols-2 gap-3">
                  {COLLABORATION_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        collaborationTypes.includes(type.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={collaborationTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCollaborationTypes([...collaborationTypes, type.value]);
                          } else {
                            setCollaborationTypes(collaborationTypes.filter(t => t !== type.value));
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Partage des revenus */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Partage des revenus
                </Label>
                <div className="space-y-4">
                  <Slider
                    value={[revenueShare]}
                    onValueChange={([value]) => setRevenueShare(value)}
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
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPartnership(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmitPartnership}
                disabled={!selectedCreator || collaborationTypes.length === 0 || createPartnership.isPending}
              >
                {createPartnership.isPending ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Handshake className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activePartnerships.length}</p>
              <p className="text-sm text-muted-foreground">Partenariats actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Inbox className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReceived.length}</p>
              <p className="text-sm text-muted-foreground">Demandes reçues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Send className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingSent.length}</p>
              <p className="text-sm text-muted-foreground">Demandes envoyées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="active" className="gap-2">
            <Handshake className="h-4 w-4" />
            Actifs ({activePartnerships.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="h-4 w-4" />
            Reçues ({pendingReceived.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Envoyées ({pendingSent.length})
          </TabsTrigger>
        </TabsList>

        {/* Partenariats actifs */}
        <TabsContent value="active" className="space-y-4">
          {activePartnerships.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Aucun partenariat actif</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Créez des collaborations avec d'autres créateurs
                </p>
                <Button onClick={() => setShowNewPartnership(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Proposer un partenariat
                </Button>
              </CardContent>
            </Card>
          ) : (
            activePartnerships.map((partnership) => {
              const { partner, myShare, theirShare } = getPartnerInfo(partnership);
              return (
                <Card key={partnership.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={partner.profile?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(partner.stageName || partner.profile?.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {partner.stageName || partner.profile?.displayName || partner.profile?.username}
                          </h4>
                          {partner.profile?.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-primary" />
                          )}
                          {getStatusBadge(partnership.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Partenariat depuis {formatDistanceToNow(new Date(partnership.acceptedAt!), { locale: fr, addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Vous: {myShare}% • Partenaire: {theirShare}%
                          </Badge>
                          {partnership.collaborationType.map(type => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {COLLABORATION_TYPES.find(t => t.value === type)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir mettre fin à ce partenariat ?')) {
                            endPartnership.mutate(partnership.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Terminer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Demandes reçues */}
        <TabsContent value="received" className="space-y-4">
          {pendingReceived.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Aucune demande reçue</h3>
                <p className="text-muted-foreground text-sm">
                  Les demandes de partenariat d'autres créateurs apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingReceived.map((partnership) => {
              const { partner, myShare, theirShare } = getPartnerInfo(partnership);
              return (
                <Card key={partnership.id} className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={partner.profile?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(partner.stageName || partner.profile?.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {partner.stageName || partner.profile?.displayName || partner.profile?.username}
                          </h4>
                          {partner.profile?.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Demande reçue {formatDistanceToNow(new Date(partnership.createdAt), { locale: fr, addSuffix: true })}
                        </p>
                        {partnership.message && (
                          <Alert className="mb-3">
                            <MessageCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {partnership.message}
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="outline" className="gap-1">
                            <Percent className="h-3 w-3" />
                            Vous: {myShare}% • Eux: {theirShare}%
                          </Badge>
                          {partnership.collaborationType.map(type => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {COLLABORATION_TYPES.find(t => t.value === type)?.label}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptPartnership.mutate(partnership.id)}
                            disabled={acceptPartnership.isPending}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Accepter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectPartnership.mutate(partnership.id)}
                            disabled={rejectPartnership.isPending}
                            className="gap-2"
                          >
                            <X className="h-4 w-4" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Demandes envoyées */}
        <TabsContent value="sent" className="space-y-4">
          {pendingSent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Aucune demande en attente</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Vos demandes de partenariat envoyées apparaîtront ici
                </p>
                <Button onClick={() => setShowNewPartnership(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Proposer un partenariat
                </Button>
              </CardContent>
            </Card>
          ) : (
            pendingSent.map((partnership) => {
              const { partner, myShare, theirShare } = getPartnerInfo(partnership);
              return (
                <Card key={partnership.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={partner.profile?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(partner.stageName || partner.profile?.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {partner.stageName || partner.profile?.displayName || partner.profile?.username}
                          </h4>
                          {partner.profile?.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-primary" />
                          )}
                          {getStatusBadge(partnership.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Envoyée {formatDistanceToNow(new Date(partnership.createdAt), { locale: fr, addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <Percent className="h-3 w-3" />
                            Vous: {myShare}% • Eux: {theirShare}%
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelPartnership.mutate(partnership.id)}
                        disabled={cancelPartnership.isPending}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnershipManager;
