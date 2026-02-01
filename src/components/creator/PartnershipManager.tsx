/**
 * Composant de gestion des partenariats entre créateurs
 * Refactorisé pour performance optimale
 */

import React, { useState, useCallback, memo } from 'react';
import { Handshake, Plus, Inbox, Send, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartnerships } from '@/hooks/usePartnerships';
import { 
  PartnershipStats, 
  PartnershipList, 
  NewPartnershipDialog 
} from './partnership';
import type { CollaborationType } from '@/types/partnership';

const PartnershipSkeleton = memo(() => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
));
PartnershipSkeleton.displayName = 'PartnershipSkeleton';

const NotCreatorMessage = memo(() => (
  <Card className="border-amber-500/20 bg-amber-500/5">
    <CardContent className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Fonctionnalité réservée aux créateurs</h3>
      <p className="text-muted-foreground">
        Vous devez avoir un profil créateur pour accéder aux partenariats.
      </p>
    </CardContent>
  </Card>
));
NotCreatorMessage.displayName = 'NotCreatorMessage';

const PartnershipHeader = memo<{
  onNewPartnership: () => void;
}>(({ onNewPartnership }) => (
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
    <Button className="gap-2" onClick={onNewPartnership}>
      <Plus className="h-4 w-4" />
      Nouveau partenariat
    </Button>
  </div>
));
PartnershipHeader.displayName = 'PartnershipHeader';

const PartnershipManager: React.FC = () => {
  const {
    currentCreatorId,
    isCreator,
    isCreatorLoading,
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

  const handleOpenNewPartnership = useCallback(() => {
    setShowNewPartnership(true);
  }, []);

  const handleCloseNewPartnership = useCallback((open: boolean) => {
    setShowNewPartnership(open);
  }, []);

  const handleSubmitPartnership = useCallback(async (data: {
    partnerId: string;
    revenueShareRequester: number;
    revenueSharePartner: number;
    message?: string;
    collaborationType: CollaborationType[];
  }) => {
    await createPartnership.mutateAsync(data);
    setShowNewPartnership(false);
  }, [createPartnership]);

  const handleAccept = useCallback((id: string) => {
    acceptPartnership.mutate(id);
  }, [acceptPartnership]);

  const handleReject = useCallback((id: string) => {
    rejectPartnership.mutate(id);
  }, [rejectPartnership]);

  const handleCancel = useCallback((id: string) => {
    cancelPartnership.mutate(id);
  }, [cancelPartnership]);

  const handleEnd = useCallback((id: string) => {
    endPartnership.mutate(id);
  }, [endPartnership]);

  // Loading state first - prevents flash of "not creator" message
  if (isCreatorLoading || isLoading) {
    return <PartnershipSkeleton />;
  }

  if (!isCreator) {
    return <NotCreatorMessage />;
  }

  return (
    <div className="space-y-6">
      <PartnershipHeader onNewPartnership={handleOpenNewPartnership} />

      <PartnershipStats
        activeCount={activePartnerships.length}
        receivedCount={pendingReceived.length}
        sentCount={pendingSent.length}
      />

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

        <TabsContent value="active" className="space-y-4">
          <PartnershipList
            partnerships={activePartnerships}
            variant="active"
            currentCreatorId={currentCreatorId}
            onNewPartnership={handleOpenNewPartnership}
            onEnd={handleEnd}
          />
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <PartnershipList
            partnerships={pendingReceived}
            variant="received"
            currentCreatorId={currentCreatorId}
            onAccept={handleAccept}
            onReject={handleReject}
            isAccepting={acceptPartnership.isPending}
            isRejecting={rejectPartnership.isPending}
          />
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <PartnershipList
            partnerships={pendingSent}
            variant="sent"
            currentCreatorId={currentCreatorId}
            onNewPartnership={handleOpenNewPartnership}
            onCancel={handleCancel}
            isCancelling={cancelPartnership.isPending}
          />
        </TabsContent>
      </Tabs>

      <NewPartnershipDialog
        open={showNewPartnership}
        onOpenChange={handleCloseNewPartnership}
        currentCreatorId={currentCreatorId}
        onSubmit={handleSubmitPartnership}
        isSubmitting={createPartnership.isPending}
      />
    </div>
  );
};

export default memo(PartnershipManager);
