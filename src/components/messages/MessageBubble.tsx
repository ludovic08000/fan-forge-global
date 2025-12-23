/**
 * Bulle de message avec support texte, images, vidéos et contenu payant
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lock, Check, CheckCheck, Image as ImageIcon, Video, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  onUnlock?: (messageId: string) => void;
  isUnlocking?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onUnlock,
  isUnlocking,
}) => {
  const isFromMe = message.is_from_me;
  const isPaidContent = message.price > 0;
  const isLocked = isPaidContent && !message.is_paid;

  const renderContent = () => {
    // Message texte
    if (message.message_type === 'text') {
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      );
    }

    // Contenu média verrouillé
    if (isLocked) {
      return (
        <div className="space-y-3">
          {/* Preview floue */}
          <div className="relative aspect-video w-48 md:w-64 rounded-lg overflow-hidden bg-muted">
            {message.media_thumbnail ? (
              <img
                src={message.media_thumbnail}
                alt="Aperçu"
                className="w-full h-full object-cover blur-xl scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                {message.message_type === 'video' ? (
                  <Video className="h-8 w-8 text-primary/50" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-primary/50" />
                )}
              </div>
            )}
            
            {/* Overlay verrouillé */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
              <Lock className="h-8 w-8 text-white mb-2" />
              <span className="text-white text-sm font-medium">
                {message.message_type === 'video' ? 'Vidéo' : 'Photo'} exclusive
              </span>
            </div>
          </div>

          {/* Bouton débloquer */}
          <Button
            onClick={() => onUnlock?.(message.id)}
            disabled={isUnlocking}
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
          >
            <Lock className="h-4 w-4 mr-2" />
            Débloquer pour {message.price.toFixed(2)}€
          </Button>
        </div>
      );
    }

    // Contenu média débloqué
    if (message.media_url) {
      return (
        <div className="space-y-2">
          {isPaidContent && (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <Check className="h-3 w-3" />
              <span>Débloqué</span>
              <Euro className="h-3 w-3 ml-1" />
              <span>{message.price.toFixed(2)}€</span>
            </div>
          )}
          
          {message.message_type === 'video' ? (
            <video
              src={message.media_url}
              controls
              className="max-w-xs md:max-w-sm rounded-lg"
              poster={message.media_thumbnail || undefined}
            />
          ) : (
            <img
              src={message.media_url}
              alt="Contenu partagé"
              className="max-w-xs md:max-w-sm rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        "flex mb-3",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          isFromMe
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
          isLocked && "bg-gradient-to-br from-card to-muted border border-border"
        )}
      >
        {renderContent()}
        
        {/* Horodatage et statut */}
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isFromMe ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px]",
            isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </span>
          {isFromMe && (
            <CheckCheck className={cn(
              "h-3 w-3",
              isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
            )} />
          )}
        </div>
      </div>
    </motion.div>
  );
};