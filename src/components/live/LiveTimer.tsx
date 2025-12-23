/**
 * Composant Timer pour les lives
 * Affiche la durée écoulée ou le compte à rebours jusqu'au démarrage
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Timer } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LiveTimerProps {
  /** Date de démarrage du live (pour durée écoulée) */
  startedAt?: string | null;
  /** Date programmée (pour compte à rebours) */
  scheduledAt?: string | null;
  /** Durée maximale en minutes (optionnel) */
  maxDuration?: number;
  /** Callback quand le temps max est atteint */
  onMaxDurationReached?: () => void;
  /** Affichage compact */
  compact?: boolean;
  /** Variante de style */
  variant?: 'default' | 'destructive' | 'warning';
}

/**
 * Formater la durée en HH:MM:SS
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Timer pour les lives en cours ou programmés
 */
export const LiveTimer = ({
  startedAt,
  scheduledAt,
  maxDuration,
  onMaxDurationReached,
  compact = false,
  variant = 'default'
}: LiveTimerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isOvertime, setIsOvertime] = useState(false);

  // Timer pour live en cours
  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
      
      // Vérifier si on dépasse la durée max
      if (maxDuration && elapsed >= maxDuration * 60) {
        setIsOvertime(true);
        onMaxDurationReached?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt, maxDuration, onMaxDurationReached]);

  // Compte à rebours pour live programmé
  useEffect(() => {
    if (!scheduledAt || startedAt) return;

    const updateCountdown = () => {
      const scheduled = new Date(scheduledAt).getTime();
      const now = Date.now();
      const diff = scheduled - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      // Formatage selon la durée restante
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}j ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt, startedAt]);

  // Compte à rebours vers le live programmé
  if (scheduledAt && !startedAt && countdown) {
    return (
      <Badge 
        variant="secondary" 
        className={`gap-1 ${compact ? 'text-xs' : ''} bg-blue-500/20 text-blue-600 border-blue-500/30`}
      >
        <Timer className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        <span>Dans {countdown}</span>
      </Badge>
    );
  }

  // Timer durée du live en cours
  if (startedAt) {
    const isWarning = variant === 'warning';
    const badgeClass = isOvertime 
      ? 'animate-pulse' 
      : isWarning
        ? 'bg-amber-500/20 text-amber-600 border-amber-500/30'
        : '';

    return (
      <Badge 
        variant={isOvertime ? 'destructive' : 'secondary'}
        className={`gap-1 ${compact ? 'text-xs' : ''} ${badgeClass}`}
      >
        <Clock className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
        {maxDuration && (
          <span className="opacity-70">/ {formatDuration(maxDuration * 60)}</span>
        )}
      </Badge>
    );
  }

  return null;
};

/**
 * Affichage de la date programmée
 */
export const ScheduledDate = ({ scheduledAt }: { scheduledAt: string }) => {
  const date = new Date(scheduledAt);
  
  return (
    <div className="text-sm text-muted-foreground">
      <span className="font-medium">
        {format(date, "EEEE d MMMM 'à' HH:mm", { locale: fr })}
      </span>
      <span className="ml-1 opacity-70">
        ({formatDistanceToNow(date, { locale: fr, addSuffix: true })})
      </span>
    </div>
  );
};
