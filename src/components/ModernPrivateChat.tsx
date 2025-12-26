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
      <div className="h-[450px] flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30">
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </motion.div>
        <p className="mt-4 text-muted-foreground font-medium">Chargement des messages...</p>
      </div>
    );
  }

  return (
    <div className="h-[450px] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 border border-border/50">
      {/* Header du chat */}
      <div className="relative p-4 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={creatorAvatar} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <motion.div 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{creatorName}</h3>
            <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              En ligne
            </p>
          </div>
          <Shield className="h-4 w-4 text-primary/50" />
        </div>
      </div>
      
      {/* Zone des messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-primary/60" />
              </div>
              <p className="text-muted-foreground font-medium">
                Commencez la conversation !
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Envoyez un message à {creatorName}
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
              
              // Statut du message
              const messageStatus = message.status || 'sent';
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className="flex items-start gap-1">
                    {/* Menu d'actions (suppression) - affiché à gauche pour mes messages */}
                    {isFromMe && canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 relative",
                        isDeleted
                          ? "bg-muted/50 border border-border/30"
                          : isFromMe
                            ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                            : "bg-muted/80 text-foreground rounded-bl-md",
                        isLocked && !isDeleted && "bg-gradient-to-br from-card to-muted/50 border border-border/50 text-foreground"
                      )}
                    >
                      {/* Effet de brillance */}
                      {isFromMe && !isLocked && !isDeleted && (
                        <div className="absolute inset-0 rounded-2xl rounded-br-md overflow-hidden pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                        </div>
                      )}
                      
                      <div className="relative z-10">
                        {isDeleted ? (
                          // Message supprimé
                          <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5" />
                            Ce message a été supprimé
                          </p>
                        ) : message.message_type === 'text' ? (
                          <p className="text-[15px] leading-relaxed">{message.content}</p>
                        ) : (
                          <div className="space-y-2">
                            {!canViewPaidContent ? (
                              // Contenu verrouillé
                              <div className="space-y-3">
                                <div className="relative aspect-[4/3] w-44 rounded-xl overflow-hidden">
                                  {message.media_thumbnail ? (
                                    <img
                                      src={message.media_thumbnail}
                                      alt="Aperçu"
                                      className="w-full h-full object-cover blur-2xl scale-125 brightness-50"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
                                  )}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                                      {message.message_type === 'video' ? (
                                        <Play className="h-5 w-5 text-white ml-0.5" />
                                      ) : (
                                        <ImageIcon className="h-5 w-5 text-white" />
                                      )}
                                    </div>
                                    <p className="text-white text-xs font-medium mt-2">
                                      {message.message_type === 'video' ? 'Vidéo' : 'Photo'} exclusive
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handlePayForContent(message.id)}
                                  disabled={payForContent.isPending}
                                  className="w-full h-9 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                                >
                                  <Lock className="h-3.5 w-3.5 mr-2" />
                                  Débloquer {message.price}€
                                </Button>
                              </div>
                            ) : (
                              // Contenu débloqué
                              <div className="space-y-2">
                                {isPaidContent && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                      <Eye className="h-3 w-3" />
                                      <span className="font-medium">Débloqué</span>
                                    </div>
                                  </div>
                                )}
                                {message.message_type === 'video' ? (
                                  <video
                                    controls
                                    className="w-full rounded-xl"
                                    poster={message.media_thumbnail}
                                  >
                                    <source src={message.media_url} type="video/mp4" />
                                  </video>
                                ) : (
                                  <img
                                    src={message.media_url}
                                    alt="Contenu"
                                    className="w-full rounded-xl"
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
                          "flex items-center gap-1.5 mt-1.5",
                          isFromMe ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-[10px] font-medium",
                            isFromMe ? "text-primary-foreground/60" : "text-muted-foreground"
                          )}>
                            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                          </span>
                          {isFromMe && (
                            messageStatus === 'sending' ? (
                              <Loader2 className="h-3 w-3 text-primary-foreground/60 animate-spin" />
                            ) : messageStatus === 'read' ? (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            ) : messageStatus === 'delivered' ? (
                              <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                            ) : (
                              <Check className="h-3 w-3 text-primary-foreground/60" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Menu d'actions - affiché à droite pour les messages reçus */}
                    {!isFromMe && canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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

      {/* Zone de saisie moderne */}
      <div className="p-3 border-t border-border/50">
        <motion.div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-xl transition-all duration-300",
            "bg-muted/50 border",
            isFocused ? "border-primary/50 shadow-lg shadow-primary/10" : "border-transparent"
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
                className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
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
            className="flex-1 h-9 rounded-lg bg-transparent border-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full transition-all",
                newMessage.trim() 
                  ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className={cn("h-4 w-4", newMessage.trim() && "-rotate-45")} />
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
