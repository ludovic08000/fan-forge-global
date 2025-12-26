/**
 * Chat privé moderne 2025 pour les dialogues et pages créateur
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  Paperclip, 
  Euro, 
  Lock, 
  Shield, 
  Sparkles,
  Loader2,
  Check,
  CheckCheck,
  X,
  Image as ImageIcon,
  Video,
  Play,
  Eye,
  Mic,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { validatePrivateMessageFile } from '@/lib/fileValidation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/live/EmojiPicker';

interface ModernPrivateChatProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  subscriberId?: string;
}

const ModernPrivateChat: React.FC<ModernPrivateChatProps> = ({ 
  creatorId, 
  creatorName, 
  creatorAvatar,
  subscriberId 
}) => {
  const { user } = useAuth();
  
  // Déterminer si l'utilisateur actuel est le créateur
  const { data: userCreatorData } = useQuery({
    queryKey: ['user-creator', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const isUserCreator = userCreatorData?.id === creatorId;
  const targetId = isUserCreator ? subscriberId : creatorId;
  
  const { messages, isLoading, sendMessage, sendPaidContent, payForContent, deleteMessage } = usePrivateMessages(targetId);
  const [newMessage, setNewMessage] = useState('');
  const [contentPrice, setContentPrice] = useState<number | string>(10);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Déterminer si l'utilisateur est l'auteur d'un message
  const isMessageAuthor = (message: any) => {
    if (isUserCreator) {
      // Si l'utilisateur est le créateur, il est l'auteur des messages de type non-text (média)
      // et des messages où il est subscriber (texte envoyé par lui en tant que créateur)
      return message.creator_id === creatorId && message.message_type !== 'text';
    } else {
      // Si l'utilisateur est un subscriber, il est l'auteur des messages texte qu'il a envoyé
      return message.subscriber_id === user?.id && message.message_type === 'text';
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (messageToDelete) {
      await deleteMessage.mutateAsync(messageToDelete);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendMessage.isPending) return;
    
    try {
      await sendMessage.mutateAsync({ content: newMessage, creatorId });
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsValidatingFile(true);

    try {
      const validationResult = await validatePrivateMessageFile(file);

      if (!validationResult.isValid) {
        toast.error(validationResult.error || 'Fichier non valide');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsValidatingFile(false);
        return;
      }

      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      
      setPreviewFile({
        url,
        type: isVideo ? 'video' : 'image',
        file,
      });
      setShowPriceInput(true);
    } catch (error) {
      toast.error('Erreur lors de la validation du fichier');
    } finally {
      setIsValidatingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelMedia = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    setShowPriceInput(false);
  };

  const handleSendMedia = async () => {
    if (!previewFile) return;

    setIsValidatingFile(true);
    try {
      const fileName = `${Date.now()}-${previewFile.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, previewFile.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      await sendPaidContent.mutateAsync({
        mediaUrl: publicUrl,
        price: Number(contentPrice) || 1,
        creatorId,
        messageType: previewFile.type,
      });

      handleCancelMedia();
      toast.success('Contenu envoyé avec succès !', {
        icon: <Sparkles className="h-4 w-4" />
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setIsValidatingFile(false);
    }
  };

  const handlePayForContent = async (messageId: string) => {
    try {
      await payForContent.mutateAsync(messageId);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-card to-background border border-border/30 shadow-2xl">
        <motion.div 
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center backdrop-blur-xl"
          animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </motion.div>
        <p className="mt-6 text-muted-foreground font-medium text-lg">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex flex-col rounded-3xl overflow-hidden bg-gradient-to-b from-card via-card/95 to-background border border-border/30 shadow-2xl">
      {/* Header élégant */}
      <div className="relative px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card via-card to-card/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-card shadow-lg">
              <AvatarImage src={creatorAvatar} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground font-bold text-lg">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <motion.div 
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 border-[2.5px] border-card shadow-lg shadow-emerald-500/30"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{creatorName}</h3>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm text-emerald-500 font-medium">En ligne</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <Shield className="h-5 w-5 text-primary/60" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Zone des messages - Design épuré */}
      <ScrollArea className="flex-1 px-4 py-6 bg-gradient-to-b from-muted/5 to-transparent">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center mb-6 shadow-inner">
                <Sparkles className="h-10 w-10 text-primary/50" />
              </div>
              <p className="text-xl font-medium text-foreground/80">
                Démarrez la conversation
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Envoyez un message à {creatorName} pour commencer
              </p>
            </motion.div>
          ) : (
            messages?.map((message, index) => {
              const isFromCreator = message.creator_id === creatorId;
              const isFromMe = isUserCreator ? isFromCreator : !isFromCreator;
              const canViewPaidContent = message.price === 0 || message.is_paid;
              const isPaidContent = message.price > 0;
              const isLocked = isPaidContent && !message.is_paid;
              const isDeleted = message.is_deleted;
              const canDelete = isMessageAuthor(message) && !isDeleted;
              const messageStatus = message.status || 'sent';
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                  className={cn(
                    "flex w-full group",
                    isFromMe ? "justify-end pl-12" : "justify-start pr-12"
                  )}
                >
                  <div className={cn(
                    "flex items-end gap-2 max-w-[85%]",
                    isFromMe ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* Menu suppression */}
                    {canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted shrink-0"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isFromMe ? "end" : "start"} className="w-36">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {/* Bulle de message */}
                    <div
                      className={cn(
                        "relative rounded-2xl transition-all duration-200",
                        isDeleted
                          ? "bg-muted/40 border border-border/20 px-4 py-3"
                          : isFromMe
                            ? "bg-primary text-primary-foreground px-4 py-3 rounded-br-sm shadow-lg shadow-primary/25"
                            : "bg-card border border-border/40 px-4 py-3 rounded-bl-sm shadow-sm",
                        isLocked && !isDeleted && "bg-gradient-to-br from-card to-muted/30 border border-border/40"
                      )}
                    >
                      {/* Effet glassmorphism subtil */}
                      {isFromMe && !isLocked && !isDeleted && (
                        <div className="absolute inset-0 rounded-2xl rounded-br-sm overflow-hidden pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                        </div>
                      )}
                      
                      <div className="relative">
                        {isDeleted ? (
                          <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5 opacity-60" />
                            Ce message a été supprimé
                          </p>
                        ) : message.message_type === 'text' ? (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          <div className="space-y-2">
                            {!canViewPaidContent ? (
                              <div className="space-y-3">
                                <div className="relative aspect-[4/3] w-52 rounded-xl overflow-hidden">
                                  {message.media_thumbnail ? (
                                    <img
                                      src={message.media_thumbnail}
                                      alt="Aperçu"
                                      className="w-full h-full object-cover blur-xl scale-110 brightness-50"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                                  )}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                                      {message.message_type === 'video' ? (
                                        <Play className="h-6 w-6 text-white ml-0.5" />
                                      ) : (
                                        <ImageIcon className="h-6 w-6 text-white" />
                                      )}
                                    </div>
                                    <p className="text-white text-xs font-medium mt-3 opacity-90">
                                      Contenu {message.message_type === 'video' ? 'vidéo' : 'photo'} exclusif
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handlePayForContent(message.id)}
                                  disabled={payForContent.isPending}
                                  className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 font-medium"
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Débloquer pour {message.price}€
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {isPaidContent && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-medium">
                                      <Eye className="h-3 w-3" />
                                      Débloqué
                                    </div>
                                  </div>
                                )}
                                {message.message_type === 'video' ? (
                                  <video
                                    controls
                                    className="w-full max-w-sm rounded-xl"
                                    poster={message.media_thumbnail}
                                  >
                                    <source src={message.media_url} type="video/mp4" />
                                  </video>
                                ) : (
                                  <img
                                    src={message.media_url}
                                    alt="Contenu"
                                    className="w-full max-w-sm rounded-xl"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Horodatage et statut */}
                      {!isDeleted && (
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 select-none",
                          isFromMe ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-[11px] font-medium",
                            isFromMe ? "text-primary-foreground/50" : "text-muted-foreground/70"
                          )}>
                            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                          </span>
                          {isFromMe && (
                            <span className="flex items-center">
                              {messageStatus === 'sending' ? (
                                <Loader2 className="h-3 w-3 text-primary-foreground/50 animate-spin" />
                              ) : messageStatus === 'read' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                              ) : messageStatus === 'delivered' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Preview média */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
              <div className="flex gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-background">
                  {previewFile.type === 'video' ? (
                    <video src={previewFile.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewFile.url} alt="Aperçu" className="w-full h-full object-cover" />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-5 w-5 rounded-full"
                    onClick={handleCancelMedia}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Prix</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={contentPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContentPrice(val === '' ? '' : Number(val));
                      }}
                      onBlur={() => {
                        if (contentPrice === '' || Number(contentPrice) < 1) {
                          setContentPrice(1);
                        } else if (Number(contentPrice) > 500) {
                          setContentPrice(500);
                        }
                      }}
                      min="1"
                      max="500"
                      className="w-20 h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendMedia}
                      disabled={isValidatingFile}
                      className="flex-1 h-8 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {isValidatingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {contentPrice}€
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de saisie moderne et élégante */}
      <div className="p-4 border-t border-border/20 bg-gradient-to-t from-card via-card to-card/80">
        <motion.div 
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
            "bg-muted/30 border",
            isFocused 
              ? "border-primary/40 shadow-lg shadow-primary/10 bg-muted/40" 
              : "border-border/30 hover:border-border/50"
          )}
        >
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />

          {isUserCreator && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendPaidContent.isPending || isValidatingFile || !!previewFile}
                className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>
            </>
          )}
          
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Écrivez votre message..."
            disabled={sendMessage.isPending}
            className="flex-1 h-10 rounded-xl bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/40"
          />
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
              className={cn(
                "h-11 w-11 rounded-xl transition-all duration-200",
                newMessage.trim() 
                  ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className={cn("h-5 w-5 transition-transform", newMessage.trim() && "-rotate-45")} />
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce message sera supprimé pour tous les participants de la conversation. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernPrivateChat;
