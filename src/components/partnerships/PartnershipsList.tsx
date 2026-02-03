import { useState } from 'react';
import { Partnership, usePartnerships } from '@/hooks/usePartnerships';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, Clock, Users, Percent, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnershipsListProps {
  partnerships: Partnership[];
  currentCreatorId: string;
}

export const PartnershipsList = ({
  partnerships,
  currentCreatorId,
}: PartnershipsListProps) => {
  const { updatePartnership } = usePartnerships(currentCreatorId);
  const [confirmAction, setConfirmAction] = useState<{
    partnershipId: string;
    action: 'accepted' | 'rejected' | 'cancelled';
  } | null>(null);

  if (partnerships.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun partenariat pour le moment</p>
        <p className="text-sm">Commencez par envoyer une demande à un autre créateur</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500">Actif</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Annulé</Badge>;
      default:
        return null;
    }
  };

  const handleAction = (partnershipId: string, action: 'accepted' | 'rejected' | 'cancelled') => {
    setConfirmAction({ partnershipId, action });
  };

  const confirmActionHandler = () => {
    if (confirmAction) {
      updatePartnership({
        partnershipId: confirmAction.partnershipId,
        status: confirmAction.action,
      });
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {partnerships.map((partnership) => {
          const isRequester = partnership.requester_id === currentCreatorId;
          const partnerData = isRequester ? partnership.partner : partnership.requester;
          const partnerProfile = isRequester ? partnership.partner_profile : partnership.requester_profile;
          const myShare = isRequester ? partnership.revenue_share_requester : partnership.revenue_share_partner;
          const theirShare = isRequester ? partnership.revenue_share_partner : partnership.revenue_share_requester;

          return (
            <Card key={partnership.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={partnerProfile?.avatar_url} />
                      <AvatarFallback>
                        {(partnerData as any)?.stage_name?.[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {(partnerData as any)?.stage_name || 'Créateur'}
                        </h3>
                        {getStatusBadge(partnership.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Vous: {myShare}% / Partenaire: {theirShare}%
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(partnership.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      {partnership.message && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {partnership.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {partnership.status === 'pending' && !isRequester && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(partnership.id, 'accepted')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(partnership.id, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </>
                    )}
                    {partnership.status === 'pending' && isRequester && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(partnership.id, 'cancelled')}
                      >
                        Annuler
                      </Button>
                    )}
                    {partnership.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(partnership.id, 'cancelled')}
                      >
                        Terminer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'accepted' && 'Accepter le partenariat ?'}
              {confirmAction?.action === 'rejected' && 'Refuser le partenariat ?'}
              {confirmAction?.action === 'cancelled' && 'Annuler le partenariat ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'accepted' &&
                'Vous allez accepter ce partenariat et commencer à partager les revenus selon les termes définis.'}
              {confirmAction?.action === 'rejected' &&
                'Cette demande de partenariat sera refusée.'}
              {confirmAction?.action === 'cancelled' &&
                'Ce partenariat sera terminé. Les revenus ne seront plus partagés.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
