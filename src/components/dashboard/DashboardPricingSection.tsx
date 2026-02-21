import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CreditCard, Tag } from 'lucide-react';
import CreatorBoost from '@/components/CreatorBoost';
import SubscriptionPricing from '@/components/creator/SubscriptionPricing';
import ReferralCodesManager from '@/components/creator/ReferralCodesManager';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardPricingSectionProps {
  creatorId: string;
  currentBoostUntil?: string | null;
}

export const DashboardPricingSection: React.FC<DashboardPricingSectionProps> = ({ 
  creatorId, 
  currentBoostUntil 
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold">{t('pricing.visibilityBoost')}</h2>
        </div>
        <CreatorBoost currentBoostUntil={currentBoostUntil} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>{t('pricing.subscriptionPrice')}</CardTitle>
          </div>
          <CardDescription>{t('pricing.setMonthlyPrice')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPricing creatorId={creatorId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle>{t('pricing.promoCodes')}</CardTitle>
          </div>
          <CardDescription>{t('pricing.createPromoCodes')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralCodesManager creatorId={creatorId} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPricingSection;
