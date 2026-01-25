import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorPrivacySettings from '@/components/creator/CreatorPrivacySettings';

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
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profil créateur</CardTitle>
          <CardDescription>Modifiez vos informations publiques</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatorSettings />
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <CreatorPrivacySettings creatorId={creatorId} />
    </div>
  );
};

export default DashboardSettingsSection;
