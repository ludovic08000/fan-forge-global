import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, Link2, Euro } from 'lucide-react';

interface PartnershipStatsProps {
  activePartnerships: number;
  pendingPartnerships: number;
  referralCodes: number;
  totalReferralEarnings: number;
}

export const PartnershipStats = ({
  activePartnerships,
  pendingPartnerships,
  referralCodes,
  totalReferralEarnings,
}: PartnershipStatsProps) => {
  const stats = [
    {
      label: 'Partenariats actifs',
      value: activePartnerships,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'En attente',
      value: pendingPartnerships,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Codes d\'affiliation',
      value: referralCodes,
      icon: Link2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Gains affiliation',
      value: `${totalReferralEarnings.toFixed(2)}€`,
      icon: Euro,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
