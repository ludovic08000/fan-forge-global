/**
 * Bulle de message premium - Style Instagram/iMessage
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  CheckCheck, 
  Check,
  Image as ImageIcon, 
  Play, 
  Euro, 
  Eye,
  Trash2,
  Copy
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ModernMessageBubbleProps {
  message: Message;
  onUnlock?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  isUnlocking?: boolean;
  isDeleting?: boolean;
}

export const ModernMessageBubble: React.FC<ModernMessageBubbleProps> = ({
  message,
  onUnlock,
  onDelete,
  isUnlocking,
  isDeleting,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isFromMe = message.is_from_me;
  const isPaidContent = message.price > 0;
  const isLocked = isPaidContent && !message.is_paid;

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Copié !');
    }
  };

  const handleDeleteConfirm = () => {
    onDelete?.(message.id);
    setShowDeleteDialog(false);
  };

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
          <div className="relative aspect-[4/3] w-52 md:w-64 rounded-2xl overflow-hidden">
            {message.media_thumbnail ? (
              <img
                src={message.media_thumbnail}
                alt="Aperçu"
                className="w-full h-full object-cover blur-xl scale-110 brightness-50"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
            )}
            
            {/* Overlay avec effet glass */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20"
              >
                {message.message_type === 'video' ? (
                  <Play className="h-7 w-7 text-white ml-1" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-white" />
                )}
              </motion.div>
              <p className="text-white font-semibold text-sm">
                {message.message_type === 'video' ? 'Vidéo' : 'Photo'} exclusive
              </p>
              <div className="flex items-center gap-1 text-white/70 text-xs mt-1">
                <Lock className="h-3 w-3" />
                <span>Contenu privé</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onUnlock?.(message.id)}
            disabled={isUnlocking}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary via-primary to-primary/80 font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            {isUnlocking ? (
              <span className="flex items-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Paiement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Débloquer - {message.price.toFixed(2)}€
              </span>
            )}
          </Button>
        </div>
      );
    }

    // Unlocked media
    if (message.media_url) {
      return (
        <div className="space-y-2">
          {isPaidContent && (
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
                <Check className="h-3 w-3" />
                Débloqué
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {message.price.toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="rounded-2xl overflow-hidden">
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
                  <div className="w-56 md:w-72 aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
                )}
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: imageLoaded ? 1 : 0 }}
                  src={message.media_url}
                  alt="Contenu"
                  className={cn(
                    "max-w-xs md:max-w-sm rounded-2xl cursor-pointer hover:brightness-95 transition-all",
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "flex mb-2 group",
          isFromMe ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-end gap-1 max-w-[85%] md:max-w-[70%]">
          {/* Bouton supprimer à gauche - TOUJOURS VISIBLE pour tous les messages */}
          <div className="flex items-center gap-1 shrink-0 mb-1">
            {message.message_type === 'text' && message.content && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted"
                onClick={handleCopyText}
                title="Copier"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Message bubble */}
          <div
            className={cn(
              "relative rounded-2xl px-4 py-2.5 shadow-sm",
              isFromMe
                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
                : "bg-muted/80 rounded-bl-md",
              isLocked && "bg-card border border-border/50 shadow-lg"
            )}
          >
            {renderContent()}
            
            {/* Timestamp + status */}
            <div className={cn(
              "flex items-center gap-1 mt-1.5",
              isFromMe ? "justify-end" : "justify-start"
            )}>
              <span className={cn(
                "text-[10px] font-medium",
                isFromMe ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
              </span>
              {isFromMe && (
                <CheckCheck className={cn(
                  "h-3.5 w-3.5",
                  message.is_paid || message.message_type === 'text' 
                    ? "text-primary-foreground/80" 
                    : "text-primary-foreground/40"
                )} />
              )}
            </div>
          </div>

          {/* Bouton copier - TOUJOURS VISIBLE pour messages reçus */}
          {!isFromMe && message.message_type === 'text' && message.content && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted shrink-0 mb-1"
              onClick={handleCopyText}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce message sera supprimé définitivement pour vous.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
