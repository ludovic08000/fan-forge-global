import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Handshake, Link2, TrendingUp } from 'lucide-react';
import { PartnershipsList } from '@/components/partnerships/PartnershipsList';
import { NewPartnershipDialog } from '@/components/partnerships/NewPartnershipDialog';
import { ReferralCodesManager } from '@/components/partnerships/ReferralCodesManager';
import { PartnershipStats } from '@/components/partnerships/PartnershipStats';
import { usePartnerships } from '@/hooks/usePartnerships';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardPartnershipsSectionProps {
  creatorId: string;
}

export const DashboardPartnershipsSection: React.FC<DashboardPartnershipsSectionProps> = ({
  creatorId,
}) => {
  const { t } = useTranslation();
  const { partnerships, referralCodes, referralSubscriptions, isLoading } = usePartnerships(creatorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  const activePartnerships = partnerships.filter(p => p.status === 'accepted');
  const pendingPartnerships = partnerships.filter(p => p.status === 'pending');

  return (
    <div className="space-y-6">
      <PartnershipStats
        activePartnerships={activePartnerships.length}
        pendingPartnerships={pendingPartnerships.length}
        referralCodes={referralCodes.length}
        totalReferralEarnings={referralCodes.reduce((sum, c) => sum + Number(c.total_earnings), 0)}
      />

      <Tabs defaultValue="partnerships">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="partnerships" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('partnershipsPage.partnerships')}</span>
          </TabsTrigger>
          <TabsTrigger value="collaborations" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">{t('partnershipsPage.collaborations')}</span>
          </TabsTrigger>
          <TabsTrigger value="affiliation" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('partnershipsPage.affiliation')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partnerships">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('partnershipsPage.myPartnerships')}</CardTitle>
                <CardDescription>
                  {t('partnershipsPage.createPartnerships')}
                </CardDescription>
              </div>
              <NewPartnershipDialog 
                creatorId={creatorId} 
                type="permanent"
              />
            </CardHeader>
            <CardContent>
              <PartnershipsList
                partnerships={partnerships.filter(p => p.partnership_type === 'permanent' || !p.partnership_type)}
                currentCreatorId={creatorId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaborations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('partnershipsPage.oneTimeCollabs')}</CardTitle>
                <CardDescription>
                  {t('partnershipsPage.collaborateOnContent')}
                </CardDescription>
              </div>
              <NewPartnershipDialog 
                creatorId={creatorId}
                type="collaboration"
              />
            </CardHeader>
            <CardContent>
              <PartnershipsList
                partnerships={partnerships.filter(p => p.partnership_type === 'collaboration')}
                currentCreatorId={creatorId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('partnershipsPage.affiliationProgram')}
              </CardTitle>
              <CardDescription>
                {t('partnershipsPage.earnCommission')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReferralCodesManager
                creatorId={creatorId}
                codes={referralCodes}
                subscriptions={referralSubscriptions}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPartnershipsSection;
