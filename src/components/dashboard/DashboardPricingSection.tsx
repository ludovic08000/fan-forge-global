import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CreditCard, Tag } from 'lucide-react';
import CreatorBoost from '@/components/CreatorBoost';
import SubscriptionPricing from '@/components/creator/SubscriptionPricing';
import ReferralCodesManager from '@/components/creator/ReferralCodesManager';

interface DashboardPricingSectionProps {
  creatorId: string;
  currentBoostUntil?: string | null;
}

export const DashboardPricingSection: React.FC<DashboardPricingSectionProps> = ({ 
  creatorId, 
  currentBoostUntil 
}) => {
  return (
    <div className="space-y-6">
      {/* Boost Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold">Boost de visibilité</h2>
        </div>
        <CreatorBoost currentBoostUntil={currentBoostUntil} />
      </div>

      {/* Subscription Pricing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Prix d'abonnement</CardTitle>
          </div>
          <CardDescription>Définissez le prix mensuel de votre abonnement</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPricing creatorId={creatorId} />
        </CardContent>
      </Card>

      {/* Referral Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle>Codes promo</CardTitle>
          </div>
          <CardDescription>Créez des codes de réduction pour vos abonnés</CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralCodesManager creatorId={creatorId} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPricingSection;
