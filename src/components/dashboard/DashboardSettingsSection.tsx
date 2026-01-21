import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import CreatorSettings from '@/components/CreatorSettings';
import StripeConnectSetup from '@/components/creator/StripeConnectSetup';

interface DashboardSettingsSectionProps {
  stripeConnected: boolean;
  creatorId: string;
}

export const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  stripeConnected,
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

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Paiements Stripe</CardTitle>
          </div>
          <CardDescription>
            {stripeConnected 
              ? "Votre compte Stripe est connecté et prêt à recevoir des paiements" 
              : "Connectez votre compte Stripe pour recevoir vos revenus"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StripeConnectSetup />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSettingsSection;
