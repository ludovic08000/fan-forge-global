import React, { Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorPrivacySettings from '@/components/creator/CreatorPrivacySettings';
import AutoMessagesManager from '@/components/creator/AutoMessagesManager';
import { DashboardPaymentsSection } from './DashboardPaymentsSection';
import { DashboardPricingSection } from './DashboardPricingSection';
import { User, Shield, MessageSquare, BarChart3, Banknote, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Loader2 } from 'lucide-react';

const CreatorAnalyticsDashboard = lazy(() => import('@/components/analytics/CreatorAnalyticsDashboard'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

interface DashboardSettingsSectionProps {
  stripeConnected: boolean;
  creatorId: string;
  currentBoostUntil?: string | null;
}

export const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  stripeConnected,
  creatorId,
  currentBoostUntil,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settingsPage.profileTab')}</span>
            <span className="sm:hidden">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('dashboard.analytics')}</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('dashboard.payments')}</span>
            <span className="sm:hidden">€</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('dashboard.subscriptionBoost')}</span>
            <span className="sm:hidden">Tarifs</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settingsPage.autoMessages')}</span>
            <span className="sm:hidden">Auto</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-2">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settingsPage.privacy')}</span>
            <span className="sm:hidden">Privé</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('settingsPage.creatorProfile')}</CardTitle>
              <CardDescription>{t('settingsPage.editPublicInfo')}</CardDescription>
            </CardHeader>
            <CardContent>
              <CreatorSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<LoadingFallback />}>
            <CreatorAnalyticsDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="payments">
          <DashboardPaymentsSection creatorId={creatorId} />
        </TabsContent>

        <TabsContent value="pricing">
          <DashboardPricingSection 
            creatorId={creatorId} 
            currentBoostUntil={currentBoostUntil}
          />
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>{t('settingsPage.autoMessagesTitle')}</CardTitle>
              <CardDescription>
                {t('settingsPage.configureAutoMessages')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutoMessagesManager creatorId={creatorId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <CreatorPrivacySettings creatorId={creatorId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardSettingsSection;
