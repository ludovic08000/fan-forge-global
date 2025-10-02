/**
 * Composant dialogue pour signaler du contenu inapproprié
 * Permet aux utilisateurs de soumettre un signalement avec raison et description
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useContentReport } from '@/hooks/useContentReport';

interface ReportContentDialogProps {
  contentId: string;
  contentTitle?: string;
  children?: React.ReactNode;
}

/**
 * Dialogue de signalement de contenu
 */
export const ReportContentDialog = ({
  contentId,
  contentTitle,
  children,
}: ReportContentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { submitReport, isSubmitting } = useContentReport();

  /**
   * Gestionnaire de soumission du formulaire
   */
  const handleSubmit = async () => {
    if (!reason) {
      return;
    }

    const result = await submitReport({
      contentId,
      reason,
      description,
    });

    if (result.success) {
      setOpen(false);
      setReason('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Signaler du contenu inapproprié</DialogTitle>
          <DialogDescription>
            {contentTitle && `Contenu: "${contentTitle}"`}
            <br />
            Aidez-nous à maintenir une communauté sûre en signalant le contenu qui viole nos règles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Sélection de la raison */}
          <div className="space-y-2">
            <Label htmlFor="reason">Raison du signalement *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Sélectionnez une raison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nudity">Nudité ou contenu sexuel explicite</SelectItem>
                <SelectItem value="violence">Violence ou contenu choquant</SelectItem>
                <SelectItem value="harassment">Harcèlement ou intimidation</SelectItem>
                <SelectItem value="hate_speech">Discours haineux ou discriminatoire</SelectItem>
                <SelectItem value="illegal">Contenu illégal</SelectItem>
                <SelectItem value="spam">Spam ou contenu trompeur</SelectItem>
                <SelectItem value="underage">Contenu impliquant des mineurs</SelectItem>
                <SelectItem value="copyright">Violation de droits d'auteur</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description optionnelle */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Détails supplémentaires (optionnel)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème avec ce contenu..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 caractères
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
