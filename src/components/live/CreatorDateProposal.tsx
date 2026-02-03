import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Send, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatorDateProposalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  onSuccess?: () => void;
}

const CreatorDateProposal: React.FC<CreatorDateProposalProps> = ({
  open,
  onOpenChange,
  creatorId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('20:00');
  const [duration, setDuration] = useState('30');
  const [message, setMessage] = useState('');
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  // Load subscriber count when dialog opens
  React.useEffect(() => {
    if (open && creatorId) {
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .then(({ count }) => setSubscriberCount(count));
    }
  }, [open, creatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const proposedDate = new Date(date);
    proposedDate.setHours(hours, minutes, 0, 0);

    // Check at least 24h in advance
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    if (proposedDate < minDate) {
      toast.error('La date doit être au minimum 24h à l\'avance');
      return;
    }

    setLoading(true);
    try {
      // Get all active subscribers
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('subscriber_id')
        .eq('creator_id', creatorId)
        .eq('status', 'active');

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        toast.error('Vous n\'avez pas encore d\'abonnés');
        setLoading(false);
        return;
      }

      // Create a message for each subscriber
      const proposedDateFormatted = format(proposedDate, 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
      const messageContent = `📅 **Proposition de Live Privé**\n\n` +
        `Je vous propose un live privé !\n\n` +
        `🗓️ Date proposée: ${proposedDateFormatted}\n` +
        `⏱️ Durée: ${duration} minutes\n` +
        (message ? `\n💬 ${message}\n` : '') +
        `\n➡️ Intéressé(e) ? Répondez à ce message ou faites une demande depuis mon profil !`;

      const messages = subscriptions.map((sub) => ({
        creator_id: creatorId,
        subscriber_id: sub.subscriber_id,
        sender_type: 'creator' as const,
        message_type: 'text' as const,
        content: messageContent,
      }));

      const { error: msgError } = await supabase
        .from('private_messages')
        .insert(messages);

      if (msgError) throw msgError;

      toast.success(`Message envoyé à ${subscriptions.length} abonné(s) !`, {
        description: 'Ils recevront votre proposition de live privé'
      });

      onOpenChange(false);
      setDate(undefined);
      setTime('20:00');
      setDuration('30');
      setMessage('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending proposal:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let h = 8; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Proposer une date de Live
          </DialogTitle>
          <DialogDescription>
            Envoyez une proposition de live privé à tous vos abonnés.
            {subscriberCount !== null && (
              <span className="flex items-center gap-1 mt-1 text-primary font-medium">
                <Users className="h-4 w-4" />
                {subscriberCount} abonné{subscriberCount > 1 ? 's' : ''} recevront ce message
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date proposée</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => {
                    const minDate = new Date();
                    minDate.setHours(minDate.getHours() + 24);
                    minDate.setHours(0, 0, 0, 0);
                    return d < minDate;
                  }}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Heure</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Durée proposée</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message personnalisé (optionnel)</Label>
            <Textarea
              placeholder="Un message pour accompagner votre proposition..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              💡 Vos abonnés recevront un message avec votre proposition.
              Ils pourront ensuite faire une demande officielle depuis votre profil.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !date || subscriberCount === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer à {subscriberCount || 0} abonné{(subscriberCount || 0) > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatorDateProposal;
