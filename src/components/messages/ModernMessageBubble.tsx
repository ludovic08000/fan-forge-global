/**
 * Bulle de message premium - Design épuré
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lock, CheckCheck, Image as ImageIcon, Play, Euro, Sparkles, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface ModernMessageBubbleProps {
  message: Message;
  onUnlock?: (messageId: string) => void;
  isUnlocking?: boolean;
}

export const ModernMessageBubble: React.FC<ModernMessageBubbleProps> = ({
  message,
  onUnlock,
  isUnlocking,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isFromMe = message.is_from_me;
  const isPaidContent = message.price > 0;
  const isLocked = isPaidContent && !message.is_paid;

  const renderContent = () => {
    // Text message
    if (message.message_type === 'text') {
      return (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      );
    }

    // Locked media
    if (isLocked) {
      return (
        <div className="space-y-3">
          <div className="relative aspect-[4/3] w-52 md:w-64 rounded-xl overflow-hidden">
            {message.media_thumbnail ? (
              <img
                src={message.media_thumbnail}
                alt="Aperçu"
                className="w-full h-full object-cover blur-xl scale-110 brightness-50"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
            )}
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                {message.message_type === 'video' ? (
                  <Play className="h-6 w-6 text-white ml-0.5" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-white" />
                )}
              </div>
              <p className="text-white text-sm font-medium">
                {message.message_type === 'video' ? 'Vidéo' : 'Photo'} exclusive
              </p>
              <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                <Lock className="h-3 w-3" />
                Contenu privé
              </p>
            </div>
          </div>

          <Button
            onClick={() => onUnlock?.(message.id)}
            disabled={isUnlocking}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 font-medium"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Débloquer - {message.price.toFixed(2)}€
          </Button>
        </div>
      );
    }

    // Unlocked media
    if (message.media_url) {
      return (
        <div className="space-y-2">
          {isPaidContent && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                <Eye className="h-3 w-3" />
                Débloqué
              </span>
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Euro className="h-3 w-3" />
                {message.price.toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="rounded-xl overflow-hidden">
            {message.message_type === 'video' ? (
              <video
                src={message.media_url}
                controls
                className="max-w-xs md:max-w-sm rounded-xl"
                poster={message.media_thumbnail || undefined}
              />
            ) : (
              <>
                {!imageLoaded && (
                  <div className="w-56 md:w-72 aspect-[4/3] rounded-xl bg-muted animate-pulse" />
                )}
                <img
                  src={message.media_url}
                  alt="Contenu"
                  className={cn(
                    "max-w-xs md:max-w-sm rounded-xl",
                    !imageLoaded && "hidden"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex mb-2",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5",
          isFromMe
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          isLocked && "bg-card border border-border"
        )}
      >
        {renderContent()}
        
        {/* Timestamp */}
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isFromMe ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px]",
            isFromMe ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </span>
          {isFromMe && (
            <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
          )}
        </div>
      </div>
    </motion.div>
  );
};