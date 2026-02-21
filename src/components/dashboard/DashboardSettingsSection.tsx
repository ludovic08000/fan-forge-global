import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorPrivacySettings from '@/components/creator/CreatorPrivacySettings';
import AutoMessagesManager from '@/components/creator/AutoMessagesManager';
import { User, Shield, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardSettingsSectionProps {
  stripeConnected: boolean;
  creatorId: string;
}

export const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  stripeConnected,
  creatorId,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('settingsPage.profileTab')}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('settingsPage.autoMessages')}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('settingsPage.privacy')}
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
