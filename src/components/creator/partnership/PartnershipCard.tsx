/**
 * Carte de partenariat réutilisable
 */

import React, { memo, useCallback } from 'react';
import { 
  Check, X, Clock, TrendingUp, Trash2, Percent, 
  MessageCircle, BadgeCheck 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PartnershipWithProfiles } from '@/types/partnership';
import { COLLABORATION_TYPES, type PartnerInfo } from './types';

interface PartnershipCardProps {
  partnership: PartnershipWithProfiles;
  partnerInfo: PartnerInfo;
  variant: 'active' | 'received' | 'sent';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  onEnd?: (id: string) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isCancelling?: boolean;
}

const StatusBadge = memo<{ status: string }>(({ status }) => {
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
});
StatusBadge.displayName = 'StatusBadge';

const PartnerAvatar = memo<{ partner: PartnerInfo['partner'] }>(({ partner }) => {
  const initial = (partner.stageName || partner.profile?.username || '?')[0].toUpperCase();
  return (
    <Avatar className="h-14 w-14 flex-shrink-0">
      <AvatarImage src={partner.profile?.avatarUrl || undefined} />
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
});
PartnerAvatar.displayName = 'PartnerAvatar';

const PartnershipCard = memo<PartnershipCardProps>(({
  partnership,
  partnerInfo,
  variant,
  onAccept,
  onReject,
  onCancel,
  onEnd,
  isAccepting,
  isRejecting,
  isCancelling,
}) => {
  const { partner, myShare, theirShare } = partnerInfo;
  const displayName = partner.stageName || partner.profile?.displayName || partner.profile?.username;

  const handleEnd = useCallback(() => {
    if (confirm('Êtes-vous sûr de vouloir mettre fin à ce partenariat ?')) {
      onEnd?.(partnership.id);
    }
  }, [onEnd, partnership.id]);

  const handleAccept = useCallback(() => onAccept?.(partnership.id), [onAccept, partnership.id]);
  const handleReject = useCallback(() => onReject?.(partnership.id), [onReject, partnership.id]);
  const handleCancel = useCallback(() => onCancel?.(partnership.id), [onCancel, partnership.id]);

  const cardClassName = variant === 'received' 
    ? 'border-amber-500/30 bg-amber-500/5' 
    : '';

  const timeLabel = variant === 'active' && partnership.acceptedAt
    ? `Partenariat depuis ${formatDistanceToNow(new Date(partnership.acceptedAt), { locale: fr, addSuffix: true })}`
    : variant === 'received'
    ? `Demande reçue ${formatDistanceToNow(new Date(partnership.createdAt), { locale: fr, addSuffix: true })}`
    : `Envoyée ${formatDistanceToNow(new Date(partnership.createdAt), { locale: fr, addSuffix: true })}`;

  return (
    <Card className={cardClassName}>
      <CardContent className="p-4">
        <div className={`flex ${variant === 'received' ? 'items-start' : 'items-center'} gap-4`}>
          <PartnerAvatar partner={partner} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">{displayName}</h4>
              {partner.profile?.isVerified && (
                <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              {variant !== 'received' && <StatusBadge status={partnership.status} />}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">{timeLabel}</p>
            
            {variant === 'received' && partnership.message && (
              <Alert className="mb-3">
                <MessageCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {partnership.message}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {variant === 'active' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Percent className="h-3 w-3" />
                )}
                Vous: {myShare}% • {variant === 'active' ? 'Partenaire' : 'Eux'}: {theirShare}%
              </Badge>
              {variant === 'active' && partnership.collaborationType.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {COLLABORATION_TYPES.find(t => t.value === type)?.label}
                </Badge>
              ))}
              {variant === 'received' && partnership.collaborationType.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {COLLABORATION_TYPES.find(t => t.value === type)?.label}
                </Badge>
              ))}
            </div>
            
            {variant === 'received' && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Accepter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Refuser
                </Button>
              </div>
            )}
          </div>
          
          {variant === 'active' && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
              onClick={handleEnd}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Terminer
            </Button>
          )}
          
          {variant === 'sent' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              className="gap-2 flex-shrink-0"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

PartnershipCard.displayName = 'PartnershipCard';

export default PartnershipCard;
