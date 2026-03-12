import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Brain, AlertTriangle, CheckCircle, Loader2, RefreshCw, Shield } from 'lucide-react';

interface Anomaly {
  type: string;
  severity: 'critical' | 'high' | 'warning';
  details: string;
  creator_id?: string;
  record_id?: string;
  amount?: number;
}

interface AuditResult {
  id: string;
  audit_type: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  anomalies_found: number;
  anomalies: Anomaly[];
  ai_analysis: string | null;
  score: number;
  created_at: string;
}

const severityColor: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  warning: 'bg-yellow-500 text-black',
};

const PaymentAuditPanel: React.FC = () => {
  const [running, setRunning] = useState(false);

  const { data: audits, refetch } = useQuery({
    queryKey: ['payment-audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_audit_results' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as unknown as AuditResult[]) || [];
    },
  });

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-payments');
      if (error) throw error;
      toast.success(`Audit terminé — Score: ${data.score}/100, ${data.anomalies_found} anomalie(s)`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'audit');
    } finally {
      setRunning(false);
    }
  };

  const latestAudit = audits?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Audit IA des paiements
          </h3>
          <p className="text-sm text-muted-foreground">
            Vérification automatique : 15% commission + Boosts 100% plateforme
          </p>
        </div>
        <Button onClick={runAudit} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Lancer l'audit
        </Button>
      </div>

      {/* Score Card */}
      {latestAudit && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dernier audit</CardTitle>
              <Badge variant={latestAudit.score >= 90 ? 'default' : latestAudit.score >= 70 ? 'secondary' : 'destructive'}>
                Score: {latestAudit.score}/100
              </Badge>
            </div>
            <CardDescription>
              {new Date(latestAudit.created_at).toLocaleString('fr-FR')} — {latestAudit.audit_type === 'scheduled' ? 'Automatique' : 'Manuel'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{latestAudit.total_transactions}</div>
                <div className="text-xs text-muted-foreground">Transactions</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-green-500">
                  {latestAudit.total_transactions - latestAudit.anomalies_found}
                </div>
                <div className="text-xs text-muted-foreground">Conformes</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className={`text-2xl font-bold ${latestAudit.anomalies_found > 0 ? 'text-destructive' : 'text-green-500'}`}>
                  {latestAudit.anomalies_found}
                </div>
                <div className="text-xs text-muted-foreground">Anomalies</div>
              </div>
            </div>

            {/* AI Analysis */}
            {latestAudit.ai_analysis && (
              <div className="p-4 rounded-lg border bg-muted/50 mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Analyse IA
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestAudit.ai_analysis}</p>
              </div>
            )}

            {/* Anomalies */}
            {latestAudit.anomalies_found > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Anomalies détectées
                </h4>
                {(latestAudit.anomalies as Anomaly[]).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Badge className={severityColor[a.severity]}>{a.severity}</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{a.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Aucune anomalie — Tous les paiements sont conformes</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {audits && audits.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {audits.slice(1).map((audit) => (
                <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {audit.score >= 90 ? (
                      <Shield className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm">{new Date(audit.created_at).toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-muted-foreground">{audit.total_transactions} transactions, {audit.anomalies_found} anomalie(s)</p>
                    </div>
                  </div>
                  <Badge variant={audit.score >= 90 ? 'default' : 'destructive'}>{audit.score}/100</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentAuditPanel;
