import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfilePollsSectionProps {
  creatorId: string;
}

export const ProfilePollsSection: React.FC<ProfilePollsSectionProps> = ({ creatorId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: polls, isLoading } = useQuery({
    queryKey: ['profile-polls', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_polls')
        .select('*, poll_options(id, label, vote_count, sort_order)')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myVotes } = useQuery({
    queryKey: ['my-poll-votes', user?.id, creatorId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('poll_votes')
        .select('poll_id, option_id')
        .eq('voter_id', user!.id);
      return data || [];
    },
  });

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) { toast.info('Connectez-vous pour voter'); return; }
    try {
      const { error } = await supabase.rpc('cast_poll_vote', { p_poll_id: pollId, p_option_id: optionId });
      if (error) throw error;
      toast.success('Vote enregistré !');
      queryClient.invalidateQueries({ queryKey: ['profile-polls'] });
      queryClient.invalidateQueries({ queryKey: ['my-poll-votes'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading || !polls?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5" /> Sondages
      </h3>
      <div className="grid gap-3">
        {polls.map((poll: any) => {
          const voted = myVotes?.find((v: any) => v.poll_id === poll.id);
          const sortedOptions = (poll.poll_options || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
          const totalVotes = poll.total_votes || 1;
          const isExpired = poll.ends_at && new Date(poll.ends_at) <= new Date();

          return (
            <Card key={poll.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">{poll.question}</h4>
                  {poll.subscribers_only && <Badge variant="secondary" className="text-xs shrink-0">Abonnés</Badge>}
                </div>

                <div className="space-y-2">
                  {sortedOptions.map((opt: any) => {
                    const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                    const isMyVote = voted?.option_id === opt.id;

                    return voted || isExpired ? (
                      <div key={opt.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            {isMyVote && <Check className="h-3 w-3 text-primary" />}
                            {opt.label}
                          </span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isMyVote ? 'bg-primary' : 'bg-muted-foreground/30'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Button key={opt.id} variant="outline" className="w-full justify-start" onClick={() => handleVote(poll.id, opt.id)}>
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">{poll.total_votes} vote(s)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProfilePollsSection;
