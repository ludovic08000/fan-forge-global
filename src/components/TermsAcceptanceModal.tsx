import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Lock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CURRENT_TERMS_VERSION = '1.0';
const CURRENT_PRIVACY_VERSION = '1.0';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({ isOpen, onAccepted }) => {
  const { user } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = termsAccepted && privacyAccepted;

  const handleAccept = async () => {
    if (!user || !canProceed) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: now,
          privacy_accepted_at: now,
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Conditions acceptées avec succès');
      onAccepted();
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Conditions d'utilisation</DialogTitle>
          </div>
          <DialogDescription>
            Avant de continuer, veuillez lire et accepter nos conditions d'utilisation et notre politique de confidentialité.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Résumé des CGU */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                <span>Conditions Générales d'Utilisation</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 pl-6 list-disc">
                <li>Cette plateforme est réservée aux personnes majeures (18 ans et plus)</li>
                <li>Vous êtes responsable du contenu que vous publiez</li>
                <li>Le partage de contenu sans autorisation est strictement interdit</li>
                <li>Nous nous réservons le droit de suspendre les comptes en infraction</li>
              </ul>
              <Link 
                to="/terms" 
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Lire les CGU complètes
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Résumé RGPD */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                <span>Politique de Confidentialité (RGPD)</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 pl-6 list-disc">
                <li>Vos données personnelles sont protégées conformément au RGPD</li>
                <li>Nous collectons uniquement les données nécessaires au service</li>
                <li>Vous pouvez demander la suppression de vos données à tout moment</li>
                <li>Vos informations de paiement sont sécurisées par Stripe</li>
              </ul>
              <Link 
                to="/privacy" 
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Lire la politique de confidentialité
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label 
                  htmlFor="terms" 
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  J'ai lu et j'accepte les{' '}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline">
                    Conditions Générales d'Utilisation
                  </Link>
                  {' '}*
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                />
                <Label 
                  htmlFor="privacy" 
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  J'ai lu et j'accepte la{' '}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                    Politique de Confidentialité
                  </Link>
                  {' '}et le traitement de mes données personnelles *
                </Label>
              </div>
            </div>

            {/* Note légale */}
            <p className="text-xs text-muted-foreground italic">
              * Champs obligatoires. En acceptant ces conditions, vous confirmez également être une personne majeure (18 ans ou plus) conformément à la législation française et européenne.
            </p>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!canProceed || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Validation...' : 'Accepter et continuer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAcceptanceModal;
