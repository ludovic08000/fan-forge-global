import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Ban, Trash2, Clock } from 'lucide-react';
import { useLiveModeration } from '@/hooks/useLiveModeration';
import { Badge } from '@/components/ui/badge';

interface LiveModerationPanelProps {
  liveStreamId: string;
  isCreator: boolean;
}

export const LiveModerationPanel = ({
  liveStreamId,
  isCreator,
}: LiveModerationPanelProps) => {
  const { settings, updateSettings } = useLiveModeration(liveStreamId);
  const [slowModeInterval, setSlowModeInterval] = useState(settings.slow_mode_interval);

  if (!isCreator) return null;

  return (
    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Modération</h3>
      </div>

      <div className="space-y-3">
        {/* Slow Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Mode lent
            </Label>
            <p className="text-xs text-muted-foreground">
              Limite la fréquence des messages
            </p>
          </div>
          <Switch
            checked={settings.slow_mode_enabled}
            onCheckedChange={(checked) =>
              updateSettings({ slow_mode_enabled: checked })
            }
          />
        </div>

        {settings.slow_mode_enabled && (
          <div className="ml-6 space-y-2">
            <Label className="text-xs">Intervalle (secondes)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={3}
                max={60}
                value={slowModeInterval}
                onChange={(e) => setSlowModeInterval(parseInt(e.target.value))}
                className="w-20"
              />
              <Button
                size="sm"
                onClick={() =>
                  updateSettings({ slow_mode_interval: slowModeInterval })
                }
              >
                Appliquer
              </Button>
            </div>
          </div>
        )}

        {/* Subscribers Only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Abonnés uniquement</Label>
            <p className="text-xs text-muted-foreground">
              Seuls les abonnés peuvent chatter
            </p>
          </div>
          <Switch
            checked={settings.subscribers_only}
            onCheckedChange={(checked) =>
              updateSettings({ subscribers_only: checked })
            }
          />
        </div>
      </div>

      {settings.slow_mode_enabled && (
        <Badge variant="secondary" className="w-fit">
          Mode lent: {settings.slow_mode_interval}s
        </Badge>
      )}
      {settings.subscribers_only && (
        <Badge variant="secondary" className="w-fit">
          Abonnés uniquement
        </Badge>
      )}
    </div>
  );
};

interface MessageModerationProps {
  messageId: string;
  userId: string;
  username: string;
  liveStreamId: string;
  isCreator: boolean;
}

export const MessageModeration = ({
  messageId,
  userId,
  username,
  liveStreamId,
  isCreator,
}: MessageModerationProps) => {
  const { banUser, deleteMessage } = useLiveModeration(liveStreamId);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('permanent');

  if (!isCreator) return null;

  const handleBan = async () => {
    const duration =
      banDuration === 'permanent' ? undefined : parseInt(banDuration);
    await banUser({ userId, reason: banReason, duration });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          <Shield className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modérer @{username}</DialogTitle>
          <DialogDescription>
            Gérer ce message et cet utilisateur
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMessage(messageId)}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer le message
          </Button>

          <div className="space-y-2">
            <Label>Bannir l'utilisateur</Label>
            <Select value={banDuration} onValueChange={setBanDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="1440">24 heures</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Raison (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />

            <Button
              variant="destructive"
              onClick={handleBan}
              className="w-full"
            >
              <Ban className="h-4 w-4 mr-2" />
              Bannir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
