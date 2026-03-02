import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreatorPollsSectionProps {
  creatorId: string;
}

export const CreatorPollsSection: React.FC<CreatorPollsSectionProps> = ({ creatorId }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [subscribersOnly, setSubscribersOnly] = useState(true);
  const [durationHours, setDurationHours] = useState('24');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: polls, isLoading } = useQuery({
    queryKey: ['creator-polls', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_polls')
        .select('*, poll_options(id, label, vote_count, sort_order)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addOption = () => { if (options.length < 6) setOptions([...options, '']); };
  const updateOption = (i: number, v: string) => { const o = [...options]; o[i] = v; setOptions(o); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      toast.error('Remplissez la question et au moins 2 options');
      return;
    }
    setSaving(true);
    try {
      const endsAt = durationHours ? new Date(Date.now() + parseInt(durationHours) * 3600000).toISOString() : null;
      const { data: poll, error } = await supabase
        .from('creator_polls')
        .insert({ creator_id: creatorId, question: question.trim(), subscribers_only: subscribersOnly, ends_at: endsAt })
        .select('id').single();
      if (error) throw error;

      const items = validOptions.map((label, i) => ({ poll_id: poll.id, label: label.trim(), sort_order: i }));
      await supabase.from('poll_options').insert(items);

      toast.success('Sondage créé !');
      setQuestion(''); setOptions(['', '']); setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['creator-polls'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const closePoll = async (id: string) => {
    await supabase.from('creator_polls').update({ status: 'closed' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['creator-polls'] });
    toast.success('Sondage fermé');
  };

  const deletePoll = async (id: string) => {
    if (!confirm('Supprimer ce sondage ?')) return;
    await supabase.from('creator_polls').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['creator-polls'] });
    toast.success('Supprimé');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Sondages
          </h2>
          <p className="text-sm text-muted-foreground">Demandez l'avis de vos abonnés</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Nouveau sondage</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !polls?.length ? (
        <Card><CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Aucun sondage</h3>
          <p className="text-sm text-muted-foreground mb-4">Créez un sondage pour engager vos fans</p>
          <Button onClick={() => setShowCreate(true)}>Créer un sondage</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {polls.map((poll: any) => {
            const sortedOptions = (poll.poll_options || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            const maxVotes = Math.max(1, ...sortedOptions.map((o: any) => o.vote_count));
            return (
              <Card key={poll.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{poll.question}</CardTitle>
                    <Badge variant={poll.status === 'active' ? 'default' : 'secondary'}>{poll.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedOptions.map((opt: any) => (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{opt.label}</span>
                        <span className="text-muted-foreground">{opt.vote_count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(opt.vote_count / maxVotes) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">{poll.total_votes} vote(s)</p>
                  <div className="flex gap-2 pt-2">
                    {poll.status === 'active' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => closePoll(poll.id)}>Fermer</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deletePoll(poll.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau sondage</DialogTitle>
            <DialogDescription>Posez une question à vos abonnés</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Question</Label><Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Quel contenu souhaitez-vous voir ?" /></div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-1">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    {options.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && <Button size="sm" variant="outline" onClick={addOption}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>}
              </div>
            </div>
            <div><Label>Durée (heures)</Label><Input type="number" value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="24" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={subscribersOnly} onCheckedChange={setSubscribersOnly} />
              <Label>Réservé aux abonnés</Label>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer le sondage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorPollsSection;
