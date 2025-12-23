/**
 * Bulle de message moderne 2025 avec animations et effets visuels premium
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Check, 
  CheckCheck, 
  Image as ImageIcon, 
  Video, 
  Euro,
  Sparkles,
  Play,
  Eye
} from 'lucide-react';
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
    // Message texte
    if (message.message_type === 'text') {
      return (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      );
    }

    // Contenu média verrouillé
    if (isLocked) {
      return (
        <div className="space-y-3">
          {/* Preview avec effet glassmorphism */}
          <div className="relative aspect-[4/3] w-56 md:w-72 rounded-2xl overflow-hidden group">
            {message.media_thumbnail ? (
              <img
                src={message.media_thumbnail}
                alt="Aperçu"
                className="w-full h-full object-cover blur-2xl scale-125 brightness-50"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
            )}
            
            {/* Overlay avec icône */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  {message.message_type === 'video' ? (
                    <Play className="h-7 w-7 text-white ml-1" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-white" />
                  )}
                </div>
                <motion.div
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/50 to-primary/30 blur-xl opacity-60"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <div className="mt-3 text-center">
                <p className="text-white font-semibold text-sm">
                  {message.message_type === 'video' ? 'Vidéo exclusive' : 'Photo exclusive'}
                </p>
                <p className="text-white/70 text-xs mt-0.5 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Contenu privé
                </p>
              </div>
            </div>
          </div>

          {/* Bouton débloquer moderne */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => onUnlock?.(message.id)}
              disabled={isUnlocking}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 shadow-lg shadow-primary/30 group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <span className="relative flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                Débloquer pour {message.price.toFixed(2)}€
              </span>
            </Button>
          </motion.div>
        </div>
      );
    }

    // Contenu média débloqué
    if (message.media_url) {
      return (
        <div className="space-y-2">
          {isPaidContent && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs"
            >
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                <Eye className="h-3 w-3" />
                <span className="font-medium">Débloqué</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Euro className="h-3 w-3" />
                {message.price.toFixed(2)}
              </span>
            </motion.div>
          )}
          
          <motion.div 
            className="relative rounded-2xl overflow-hidden group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {message.message_type === 'video' ? (
              <video
                src={message.media_url}
                controls
                className="max-w-xs md:max-w-sm rounded-2xl"
                poster={message.media_thumbnail || undefined}
              />
            ) : (
              <>
                {!imageLoaded && (
                  <div className="w-64 md:w-80 aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
                )}
                <img
                  src={message.media_url}
                  alt="Contenu partagé"
                  className={cn(
                    "max-w-xs md:max-w-sm rounded-2xl transition-all duration-300",
                    !imageLoaded && "opacity-0 absolute",
                    imageLoaded && "opacity-100"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </motion.div>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        "flex mb-3",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <motion.div
        whileHover={{ scale: isLocked ? 1 : 1.01 }}
        className={cn(
          "max-w-[85%] md:max-w-[70%] relative",
          // Bulle de message
          "rounded-3xl px-4 py-3",
          // Style selon expéditeur
          isFromMe
            ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-br-lg shadow-lg shadow-primary/20"
            : "bg-muted/80 backdrop-blur-sm text-foreground rounded-bl-lg border border-border/50",
          // Style contenu verrouillé
          isLocked && "bg-gradient-to-br from-card via-card to-muted/50 border border-border/50 text-foreground"
        )}
      >
        {/* Effet de brillance pour les messages envoyés */}
        {isFromMe && !isLocked && (
          <div className="absolute inset-0 rounded-3xl rounded-br-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          </div>
        )}
        
        <div className="relative z-10">
          {renderContent()}
        </div>
        
        {/* Horodatage et statut */}
        <div className={cn(
          "flex items-center gap-1.5 mt-1.5",
          isFromMe ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px] font-medium",
            isFromMe 
              ? "text-primary-foreground/60" 
              : "text-muted-foreground"
          )}>
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </span>
          {isFromMe && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCheck className={cn(
                "h-3.5 w-3.5",
                "text-primary-foreground/60"
              )} />
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
