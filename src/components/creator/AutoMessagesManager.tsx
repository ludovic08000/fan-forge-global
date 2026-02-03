/**
 * Gestionnaire des messages automatiques pour les créateurs
 * - Message de bienvenue (nouvel abonné)
 * - Alertes d'expiration (7 jours, 1 jour avant)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  UserPlus, 
  Clock, 
  AlertTriangle, 
  Save, 
  Sparkles,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoMessage {
  id?: string;
  creator_id: string;
  message_type: 'welcome' | 'expiration_warning' | 'expiration_final';
  title: string;
  content: string;
  is_enabled: boolean;
  days_before_expiration: number | null;
}

interface AutoMessagesManagerProps {
  creatorId: string;
}

const MESSAGE_TEMPLATES = {
  welcome: {
    title: 'Message de bienvenue',
    defaultContent: `Bienvenue {subscriber_name} ! 🎉

Merci de me rejoindre ! Je suis ravi(e) de t'avoir parmi mes abonnés.

Tu as maintenant accès à tout mon contenu exclusif. N'hésite pas à me contacter si tu as des questions.

À très vite ! 💫
{creator_name}`,
    icon: UserPlus,
    description: 'Envoyé automatiquement aux nouveaux abonnés',
    color: 'bg-green-500',
  },
  expiration_warning: {
    title: 'Rappel d\'expiration (7 jours)',
    defaultContent: `Hey {subscriber_name} ! 👋

Je voulais te prévenir que ton abonnement expire dans 7 jours.

Ne rate pas le nouveau contenu exclusif que je prépare ! Pense à renouveler pour ne rien manquer.

{creator_name}`,
    icon: Clock,
    description: 'Envoyé 7 jours avant l\'expiration',
    color: 'bg-amber-500',
    days: 7,
  },
  expiration_final: {
    title: 'Dernier rappel (1 jour)',
    defaultContent: `{subscriber_name}, ton abonnement expire demain ! ⏰

C'est ta dernière chance de rester connecté(e) à mon contenu exclusif.

J'espère te revoir très vite !
{creator_name}`,
    icon: AlertTriangle,
    description: 'Envoyé 1 jour avant l\'expiration',
    color: 'bg-red-500',
    days: 1,
  },
};

export const AutoMessagesManager = ({ creatorId }: AutoMessagesManagerProps) => {
  const [messages, setMessages] = useState<Record<string, AutoMessage>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, [creatorId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_auto_messages')
        .select('*')
        .eq('creator_id', creatorId);

      if (error) throw error;

      const messagesMap: Record<string, AutoMessage> = {};
      
      // Initialiser avec les valeurs par défaut
      Object.entries(MESSAGE_TEMPLATES).forEach(([type, template]) => {
        messagesMap[type] = {
          creator_id: creatorId,
          message_type: type as AutoMessage['message_type'],
          title: template.title,
          content: template.defaultContent,
          is_enabled: false,
          days_before_expiration: 'days' in template ? template.days : null,
        };
      });

      // Remplacer par les données existantes
      data?.forEach((msg) => {
        messagesMap[msg.message_type] = msg as AutoMessage;
      });

      setMessages(messagesMap);
    } catch (error) {
      console.error('Error loading auto messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (type: string) => {
    const message = messages[type];
    if (!message) return;

    setSaving(type);

    try {
      const data = {
        creator_id: creatorId,
        message_type: type,
        title: message.title,
        content: message.content,
        is_enabled: message.is_enabled,
        days_before_expiration: message.days_before_expiration,
      };

      if (message.id) {
        // Update existing
        const { error } = await supabase
          .from('creator_auto_messages')
          .update(data)
          .eq('id', message.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data: newMsg, error } = await supabase
          .from('creator_auto_messages')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        setMessages(prev => ({
          ...prev,
          [type]: { ...prev[type], id: newMsg.id },
        }));
      }

      toast.success('Message sauvegardé !');
    } catch (error: any) {
      console.error('Error saving auto message:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const updateMessage = (type: string, field: keyof AutoMessage, value: any) => {
    setMessages(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          Variables disponibles : <code className="bg-background px-1 rounded">{'{subscriber_name}'}</code> (nom de l'abonné), 
          <code className="bg-background px-1 rounded ml-1">{'{creator_name}'}</code> (votre nom)
        </p>
      </div>

      {Object.entries(MESSAGE_TEMPLATES).map(([type, template]) => {
        const message = messages[type];
        const Icon = template.icon;
        const isSaving = saving === type;

        return (
          <Card key={type} className="card-premium">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${template.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={message?.is_enabled || false}
                    onCheckedChange={(checked) => updateMessage(type, 'is_enabled', checked)}
                  />
                  <Badge variant={message?.is_enabled ? 'default' : 'secondary'}>
                    {message?.is_enabled ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`${type}-content`}>Contenu du message</Label>
                <Textarea
                  id={`${type}-content`}
                  value={message?.content || ''}
                  onChange={(e) => updateMessage(type, 'content', e.target.value)}
                  rows={6}
                  className="mt-1.5 font-mono text-sm"
                  placeholder="Écrivez votre message..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMessage(type, 'content', template.defaultContent)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Réinitialiser le modèle
                </Button>

                <Button
                  onClick={() => saveMessage(type)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AutoMessagesManager;
