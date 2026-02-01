/**
 * Statistiques des partenariats
 */

import React, { memo } from 'react';
import { Handshake, Inbox, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PartnershipStatsProps {
  activeCount: number;
  receivedCount: number;
  sentCount: number;
}

const PartnershipStats = memo<PartnershipStatsProps>(({ 
  activeCount, 
  receivedCount, 
  sentCount 
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Handshake className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-sm text-muted-foreground">Partenariats actifs</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Inbox className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <p className="text-2xl font-bold">{receivedCount}</p>
          <p className="text-sm text-muted-foreground">Demandes reçues</p>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Send className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <p className="text-2xl font-bold">{sentCount}</p>
          <p className="text-sm text-muted-foreground">Demandes envoyées</p>
        </div>
      </CardContent>
    </Card>
  </div>
));

PartnershipStats.displayName = 'PartnershipStats';

export default PartnershipStats;
