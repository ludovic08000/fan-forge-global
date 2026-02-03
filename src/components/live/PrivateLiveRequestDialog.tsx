import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Video, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PrivateLiveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
}

const PrivateLiveRequestDialog: React.FC<PrivateLiveRequestDialogProps> = ({
  open,
  onOpenChange,
  creatorId,
  creatorName,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('20:00');
  const [duration, setDuration] = useState('20');
  const [message, setMessage] = useState('');

  // Vérifier l'abonnement quand le dialog s'ouvre
  React.useEffect(() => {
    const checkSubscription = async () => {
      if (!open || !user || !creatorId) return;
      
      setCheckingSubscription(true);
      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', creatorId)
          .eq('status', 'active')
          .maybeSingle();
        
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [open, user, creatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.info('Connectez-vous pour demander un live privé');
      navigate('/login');
      return;
    }

    // Vérifier l'abonnement
    if (!isSubscribed) {
      toast.error('Vous devez être abonné à ce créateur pour demander un live privé');
      return;
    }

    if (!date) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const proposedDate = new Date(date);
    proposedDate.setHours(hours, minutes, 0, 0);

    // Vérifier minimum 48h à l'avance
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 48);
    if (proposedDate < minDate) {
      toast.error('La date doit être au minimum 48h à l\'avance');
      return;
    }

    setLoading(true);
    try {
      // Vérifier la limite de 3 demandes en attente
      const { count } = await supabase
        .from('private_live_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .in('status', ['pending', 'accepted']);

      if (count && count >= 3) {
        toast.error('Vous avez déjà 3 demandes en attente. Attendez qu\'elles soient traitées ou annulez-en une.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('private_live_requests')
        .insert({
          creator_id: creatorId,
          requester_id: user.id,
          proposed_date: proposedDate.toISOString(),
          proposed_duration: parseInt(duration),
          message: message.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      // Envoyer un message au créateur via la messagerie
      await supabase
        .from('private_messages')
        .insert({
          creator_id: creatorId,
          subscriber_id: user.id,
          sender_type: 'subscriber',
          message_type: 'text',
          content: `📅 Demande de live privé\n\n` +
            `Date proposée: ${format(proposedDate, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}\n` +
            `Durée souhaitée: ${duration} minutes\n` +
            (message ? `\nMessage: ${message}` : '') +
            `\n\n➡️ Rendez-vous dans votre calendrier pour accepter et fixer le prix.`
        });

      toast.success('Demande de live privé envoyée !', {
        description: 'Le créateur recevra votre demande et vous répondra bientôt.'
      });

      onOpenChange(false);
      setDate(undefined);
      setTime('20:00');
      setDuration('30');
      setMessage('');
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  // Générer les créneaux horaires
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
            <Video className="h-5 w-5 text-primary" />
            Demander un live privé
          </DialogTitle>
          <DialogDescription>
            Proposez une date pour un live exclusif avec {creatorName}. 
            Le créateur fixera le prix s'il accepte.
          </DialogDescription>
        </DialogHeader>

        {checkingSubscription ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
        <>
          {isSubscribed === false && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Vous devez être abonné à {creatorName} pour envoyer cette demande.
            </div>
          )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date souhaitée</Label>
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
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => {
                    // Minimum 48h à l'avance
                    const minDate = new Date();
                    minDate.setHours(minDate.getHours() + 48);
                    minDate.setHours(0, 0, 0, 0);
                    return d < minDate;
                  }}
                  initialFocus
                  locale={fr}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Heure */}
          <div className="space-y-2">
            <Label>Heure souhaitée</Label>
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

          {/* Durée - limitée à 20 minutes max */}
          <div className="space-y-2">
            <Label>Durée souhaitée (max 20 min)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              💡 Le créateur peut prolonger le live pendant la session (+5€ par 20 min)
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message (optionnel)</Label>
            <Textarea
              placeholder="Décrivez ce que vous aimeriez pour ce live privé..."
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
              💡 Le créateur recevra votre demande et fixera un prix entre 10€ et 500€.
              Vous pourrez ensuite payer pour confirmer le rendez-vous.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !date}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer la demande'
              )}
            </Button>
          </DialogFooter>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrivateLiveRequestDialog;
