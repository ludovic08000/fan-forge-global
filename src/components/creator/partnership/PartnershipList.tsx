/**
 * Liste des partenariats avec états vides
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Users, Inbox, Send, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PartnershipWithProfiles } from '@/types/partnership';
import PartnershipCard from './PartnershipCard';
import type { PartnerInfo } from './types';

interface PartnershipListProps {
  partnerships: PartnershipWithProfiles[];
  variant: 'active' | 'received' | 'sent';
  currentCreatorId: string | undefined;
  onNewPartnership?: () => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  onEnd?: (id: string) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isCancelling?: boolean;
}

const EmptyState = memo<{
  variant: 'active' | 'received' | 'sent';
  onNewPartnership?: () => void;
}>(({ variant, onNewPartnership }) => {
  const config = {
    active: {
      icon: Users,
      title: 'Aucun partenariat actif',
      description: 'Créez des collaborations avec d\'autres créateurs',
      showButton: true,
    },
    received: {
      icon: Inbox,
      title: 'Aucune demande reçue',
      description: 'Les demandes de partenariat d\'autres créateurs apparaîtront ici',
      showButton: false,
    },
    sent: {
      icon: Send,
      title: 'Aucune demande en attente',
      description: 'Vos demandes de partenariat envoyées apparaîtront ici',
      showButton: true,
    },
  }[variant];

  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold mb-2">{config.title}</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {config.description}
        </p>
        {config.showButton && onNewPartnership && (
          <Button onClick={onNewPartnership} className="gap-2">
            <Plus className="h-4 w-4" />
            Proposer un partenariat
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
EmptyState.displayName = 'EmptyState';

const PartnershipList = memo<PartnershipListProps>(({
  partnerships,
  variant,
  currentCreatorId,
  onNewPartnership,
  onAccept,
  onReject,
  onCancel,
  onEnd,
  isAccepting,
  isRejecting,
  isCancelling,
}) => {
  const getPartnerInfo = useCallback((partnership: PartnershipWithProfiles): PartnerInfo => {
    const isRequester = partnership.requesterId === currentCreatorId;
    const partner = isRequester ? partnership.partner : partnership.requester;
    return {
      isRequester,
      partner,
      myShare: isRequester ? partnership.revenueShareRequester : partnership.revenueSharePartner,
      theirShare: isRequester ? partnership.revenueSharePartner : partnership.revenueShareRequester,
    };
  }, [currentCreatorId]);

  const partnerInfoMap = useMemo(() => {
    const map = new Map<string, PartnerInfo>();
    partnerships.forEach(p => {
      map.set(p.id, getPartnerInfo(p));
    });
    return map;
  }, [partnerships, getPartnerInfo]);

  if (partnerships.length === 0) {
    return <EmptyState variant={variant} onNewPartnership={onNewPartnership} />;
  }

  return (
    <div className="space-y-4">
      {partnerships.map((partnership) => (
        <PartnershipCard
          key={partnership.id}
          partnership={partnership}
          partnerInfo={partnerInfoMap.get(partnership.id)!}
          variant={variant}
          onAccept={onAccept}
          onReject={onReject}
          onCancel={onCancel}
          onEnd={onEnd}
          isAccepting={isAccepting}
          isRejecting={isRejecting}
          isCancelling={isCancelling}
        />
      ))}
    </div>
  );
});

PartnershipList.displayName = 'PartnershipList';

export default PartnershipList;
