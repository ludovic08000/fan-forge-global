import React from 'react';
import { Button } from '@/components/ui/button';
import { Banknote, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardStripeAlertProps {
  onConfigure: () => void;
}

export const DashboardStripeAlert: React.FC<DashboardStripeAlertProps> = ({ onConfigure }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3 sm:p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Banknote className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-foreground truncate">
            {t('dashboard.configurePayments')}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {t('dashboard.connectStripe')}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onConfigure}
        className="h-8 shrink-0 gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90"
      >
        {t('dashboard.configure')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default DashboardStripeAlert;
