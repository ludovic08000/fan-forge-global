import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Mail, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuspensionDetails {
  reason: string;
  suspended_at: string;
}

const Suspended = () => {
  const [suspensionDetails, setSuspensionDetails] = useState<SuspensionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactForm, setContactForm] = useState({
    email: '',
    subject: 'Appel de suspension de compte',
    message: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkSuspension = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Récupérer les détails de suspension
      const { data: suspension } = await supabase
        .from('user_suspensions')
        .select('reason, suspended_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!suspension) {
        // Pas suspendu, rediriger vers l'accueil
        navigate('/');
        return;
      }

      setSuspensionDetails(suspension);
      setContactForm(prev => ({ ...prev, email: user.email || '' }));
      setLoading(false);
    };

    checkSuspension();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // Pour l'instant, afficher un message de confirmation
      // Plus tard, on pourrait intégrer un système d'email via edge function
      toast.success('Votre demande a été envoyée. Notre équipe vous répondra sous 48-72h.');
      setContactForm(prev => ({ ...prev, message: '' }));
    } catch (error) {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const suspendedDate = suspensionDetails 
    ? new Date(suspensionDetails.suspended_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Compte suspendu
          </h1>
          <p className="text-muted-foreground mt-2">
            Votre accès à la plateforme a été temporairement restreint
          </p>
        </div>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg">Détails de la suspension</CardTitle>
            <CardDescription>
              Informations concernant la suspension de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Date de suspension :</span>
                <p className="font-medium">{suspendedDate}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Raison :</span>
                <p className="font-medium text-destructive">{suspensionDetails?.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contacter le support
            </CardTitle>
            <CardDescription>
              Vous pensez qu'il s'agit d'une erreur ? Envoyez-nous un message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Votre email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Votre message</Label>
                <Textarea
                  id="message"
                  placeholder="Expliquez pourquoi vous pensez que cette suspension est une erreur..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={5}
                  required
                  className="resize-none"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={sending || !contactForm.message.trim()}
              >
                {sending ? (
                  'Envoi en cours...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer ma demande
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Pour toute question urgente, contactez-nous à{' '}
            <a href="mailto:support@theforge.fr" className="text-primary hover:underline">
              support@theforge.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Suspended;
