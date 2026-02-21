import React from 'react';
import { Button } from '@/components/ui/button';
import { Banknote } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardStripeAlertProps {
  onConfigure: () => void;
}

export const DashboardStripeAlert: React.FC<DashboardStripeAlertProps> = ({ onConfigure }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Banknote className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-600">{t('dashboard.configurePayments')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.connectStripe')}</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onConfigure} 
        className="rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
      >
        {t('dashboard.configure')}
      </Button>
    </div>
  );
};

export default DashboardStripeAlert;
