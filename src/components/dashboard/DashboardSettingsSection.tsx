import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorPrivacySettings from '@/components/creator/CreatorPrivacySettings';
import AutoMessagesManager from '@/components/creator/AutoMessagesManager';
import { User, Shield, MessageSquare } from 'lucide-react';

interface DashboardSettingsSectionProps {
  stripeConnected: boolean;
  creatorId: string;
}

export const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  stripeConnected,
  creatorId,
}) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages auto
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Confidentialité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil créateur</CardTitle>
              <CardDescription>Modifiez vos informations publiques</CardDescription>
            </CardHeader>
            <CardContent>
              <CreatorSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages automatiques</CardTitle>
              <CardDescription>
                Configurez les messages envoyés automatiquement à vos abonnés
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
