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
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Upload
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
  fullScreen?: boolean;
}

const ModernPrivateChat: React.FC<ModernPrivateChatProps> = ({ 
  creatorId, 
  creatorName, 
  creatorAvatar,
  subscriberId,
  fullScreen = false
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
  
  const { messages, isLoading, sendMessage, sendPaidContent, sendMediaRequest, respondToMediaRequest, payForContent, payForMediaRequest, deleteMessage } = usePrivateMessages(targetId);
  const [newMessage, setNewMessage] = useState('');
  const [contentPrice, setContentPrice] = useState<number | string>(10);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [requestPriceDialogOpen, setRequestPriceDialogOpen] = useState(false);
  const [requestToPrice, setRequestToPrice] = useState<string | null>(null);
  const [requestPrice, setRequestPrice] = useState<number | string>(5);
  const [isSubscriberUpload, setIsSubscriberUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriberFileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Déterminer si l'utilisateur est l'auteur d'un message
  const isMessageAuthor = (message: any) => {
    if (isUserCreator) {
      // Si l'utilisateur est le créateur, il est l'auteur de ses propres messages
      // Les créateurs envoient les médias payants (message_type !== 'text')
      // ET les messages texte envoyés par le créateur (côté créateur, les messages "from me" ont creator_id = creatorId)
      const isCreatorMessage = message.creator_id === creatorId;
      // Le créateur est l'auteur si c'est un média OU si c'est un message où il est "from me"
      // Dans le contexte du chat, les messages du créateur ont creator_id = son propre ID
      return isCreatorMessage && (message.message_type !== 'text' || message.subscriber_id !== user?.id);
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
    setIsSubscriberUpload(false);
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

      if (isSubscriberUpload) {
        // Abonné envoie une demande de média
        await sendMediaRequest.mutateAsync({
          mediaUrl: publicUrl,
          creatorId,
          messageType: previewFile.type,
        });
      } else {
        // Créateur envoie du contenu payant
        await sendPaidContent.mutateAsync({
          mediaUrl: publicUrl,
          price: Number(contentPrice) || 1,
          creatorId,
          messageType: previewFile.type,
        });
      }

      handleCancelMedia();
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setIsValidatingFile(false);
    }
  };

  // Gérer la sélection de fichier par l'abonné
  const handleSubscriberFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsValidatingFile(true);

    try {
      const validationResult = await validatePrivateMessageFile(file);

      if (!validationResult.isValid) {
        toast.error(validationResult.error || 'Fichier non valide');
        if (subscriberFileInputRef.current) {
          subscriberFileInputRef.current.value = '';
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
      setIsSubscriberUpload(true);
      setShowPriceInput(false); // Pas de prix pour l'abonné
    } catch (error) {
      toast.error('Erreur lors de la validation du fichier');
    } finally {
      setIsValidatingFile(false);
      if (subscriberFileInputRef.current) {
        subscriberFileInputRef.current.value = '';
      }
    }
  };

  // Créateur accepte la demande et fixe un prix
  const handleAcceptRequest = (messageId: string) => {
    setRequestToPrice(messageId);
    setRequestPrice(5);
    setRequestPriceDialogOpen(true);
  };

  const confirmAcceptRequest = async () => {
    if (requestToPrice) {
      await respondToMediaRequest.mutateAsync({
        messageId: requestToPrice,
        action: 'accept',
        price: Number(requestPrice) || 1,
      });
      setRequestPriceDialogOpen(false);
      setRequestToPrice(null);
    }
  };

  // Créateur refuse la demande
  const handleRejectRequest = async (messageId: string) => {
    await respondToMediaRequest.mutateAsync({
      messageId,
      action: 'reject',
    });
  };

  // Abonné paie pour sa propre demande
  const handlePayForRequest = async (messageId: string) => {
    try {
      await payForMediaRequest.mutateAsync(messageId);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
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
      <div className={cn(
        "flex flex-col items-center justify-center bg-gradient-to-b from-card to-background",
        fullScreen ? "h-full" : "h-[600px] rounded-3xl border border-border/30 shadow-2xl"
      )}>
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
    <div className={cn(
      "flex flex-col overflow-hidden bg-card",
      fullScreen 
        ? "h-full" 
        : "h-[550px] rounded-2xl border border-border/50 shadow-xl"
    )}>
      {/* Header compact et élégant - masqué en mode plein écran car le header est dans la page */}
      {!fullScreen && (
        <div className="px-4 py-3 border-b border-border/50 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9 ring-1 ring-primary/20">
                <AvatarImage src={creatorAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{creatorName}</h3>
              <span className="text-xs text-emerald-500">En ligne</span>
            </div>
            <Shield className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>
      )}
      
      {/* Zone des messages */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Envoyez un message à {creatorName}
              </p>
            </div>
          ) : (
            messages?.map((message, index) => {
              const isFromCreator = message.creator_id === creatorId;
              const isFromMe = isUserCreator ? isFromCreator : !isFromCreator;
              const canViewPaidContent = message.price === 0 || message.price === null || message.is_paid;
              const isPaidContent = (message.price ?? 0) > 0;
              const isLocked = isPaidContent && !message.is_paid;
              const isDeleted = message.is_deleted;
              const canDelete = isMessageAuthor(message) && !isDeleted;
              const messageStatus = message.status || 'sent';
              
              // Déterminer si c'est une demande de média
              const isMediaRequest = message.message_type === 'image_request' || message.message_type === 'video_request';
              const mediaRequestType = message.message_type === 'video_request' ? 'video' : 'image';
              const isRequestPending = isMediaRequest && messageStatus === 'pending';
              const isRequestPriceSet = isMediaRequest && messageStatus === 'price_set';
              const isRequestRejected = isMediaRequest && messageStatus === 'rejected';
              const isRequestPaid = isMediaRequest && message.is_paid;
              
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
                    {/* Bouton suppression - visible uniquement pour l'auteur */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Bulle de message compacte */}
                    <div
                      className={cn(
                        "relative rounded-2xl px-3 py-2 text-sm",
                        isDeleted
                          ? "bg-muted/50 border border-border/30"
                          : isRequestRejected
                            ? "bg-destructive/10 border border-destructive/30"
                            : isMediaRequest
                              ? "bg-amber-500/10 border border-amber-500/30"
                              : isFromMe
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted/60 rounded-bl-md",
                        isLocked && !isDeleted && !isMediaRequest && "bg-muted/40 border border-border/30"
                      )}
                    >
                      <div className="relative">
                        {isDeleted ? (
                          <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                            <Trash2 className="h-3 w-3" />
                            Message supprimé
                          </p>
                        ) : isMediaRequest ? (
                          /* DEMANDE DE MÉDIA */
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-medium">
                                Demande de {mediaRequestType === 'video' ? 'vidéo' : 'photo'}
                              </span>
                            </div>
                            
                            {/* Aperçu flouté du média */}
                            <div className="relative aspect-[4/3] w-48 md:w-56 rounded-xl overflow-hidden">
                              {message.media_url && !isRequestPaid ? (
                                <img
                                  src={message.media_url}
                                  alt="Aperçu"
                                  className="w-full h-full object-cover blur-xl scale-110 brightness-50"
                                />
                              ) : message.media_url && isRequestPaid ? (
                                mediaRequestType === 'video' ? (
                                  <video src={message.media_url} controls className="w-full h-full object-cover" />
                                ) : (
                                  <img src={message.media_url} alt="Média" className="w-full h-full object-cover" />
                                )
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-amber-500/20 to-amber-500/10" />
                              )}
                              
                              {/* Overlay si pas payé */}
                              {!isRequestPaid && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                  {isRequestPending && (
                                    <div className="text-center">
                                      <Clock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                                      <p className="text-white text-xs">En attente</p>
                                    </div>
                                  )}
                                  {isRequestPriceSet && (
                                    <div className="text-center">
                                      <Euro className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                                      <p className="text-white text-sm font-semibold">{message.price?.toFixed(2)}€</p>
                                    </div>
                                  )}
                                  {isRequestRejected && (
                                    <div className="text-center">
                                      <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                                      <p className="text-white text-xs">Refusé</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Actions selon le statut et le rôle */}
                            {isUserCreator && isRequestPending && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-9 border-destructive/50 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRejectRequest(message.id)}
                                  disabled={respondToMediaRequest.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Refuser
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleAcceptRequest(message.id)}
                                  disabled={respondToMediaRequest.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accepter
                                </Button>
                              </div>
                            )}
                            
                            {!isUserCreator && isRequestPriceSet && (
                              <Button
                                size="sm"
                                className="w-full h-9 bg-gradient-to-r from-primary to-primary/80"
                                onClick={() => handlePayForRequest(message.id)}
                                disabled={payForMediaRequest.isPending}
                              >
                                {payForMediaRequest.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Euro className="h-4 w-4 mr-1" />
                                )}
                                Payer {message.price?.toFixed(2)}€
                              </Button>
                            )}
                            
                            {isRequestPaid && (
                              <div className="flex items-center gap-1.5 text-emerald-500 text-xs">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Payé - Contenu visible</span>
                              </div>
                            )}
                            
                            {isRequestRejected && (
                              <div className="flex items-center gap-1.5 text-destructive text-xs">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Demande refusée</span>
                              </div>
                            )}
                            
                            {!isUserCreator && isRequestPending && (
                              <div className="flex items-center gap-1.5 text-amber-500 text-xs">
                                <Clock className="h-3.5 w-3.5" />
                                <span>En attente de réponse du créateur</span>
                              </div>
                            )}
                          </div>
                        ) : message.message_type === 'text' ? (
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          <div className="space-y-2">
                            {!canViewPaidContent ? (
                              /* MÉDIA VERROUILLÉ - Design Premium */
                              <div className="relative">
                                <div className="relative aspect-[4/3] w-56 md:w-64 rounded-2xl overflow-hidden">
                                  {/* Background avec blur */}
                                  {message.media_thumbnail ? (
                                    <img
                                      src={message.media_thumbnail}
                                      alt="Aperçu"
                                      className="w-full h-full object-cover blur-xl scale-110 brightness-50"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
                                  )}
                                  
                                  {/* Overlay glass effect */}
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                                  
                                  {/* Contenu central */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    {/* Icône animée */}
                                    <motion.div 
                                      initial={{ scale: 0.9 }}
                                      animate={{ scale: [1, 1.05, 1] }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20 shadow-xl"
                                    >
                                      {message.message_type === 'video' ? (
                                        <Play className="h-7 w-7 text-white ml-1" />
                                      ) : (
                                        <ImageIcon className="h-7 w-7 text-white" />
                                      )}
                                    </motion.div>
                                    
                                    {/* Texte */}
                                    <p className="text-white font-semibold text-sm mb-1">
                                      {message.message_type === 'video' ? 'Vidéo' : 'Photo'} exclusive
                                    </p>
                                    <div className="flex items-center gap-1.5 text-white/70 text-xs mb-4">
                                      <Lock className="h-3 w-3" />
                                      <span>Contenu privé</span>
                                    </div>
                                    
                                    {/* Bouton débloquer premium */}
                                    <Button
                                      onClick={() => handlePayForContent(message.id)}
                                      disabled={payForContent.isPending}
                                      className="w-full max-w-[180px] h-11 rounded-xl bg-gradient-to-r from-primary via-primary to-primary/80 font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.02]"
                                    >
                                      {payForContent.isPending ? (
                                        <span className="flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Paiement...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <Eye className="h-4 w-4" />
                                          Débloquer - {message.price?.toFixed(2)}€
                                        </span>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* MÉDIA DÉBLOQUÉ - Affichage premium */
                              <div className="space-y-2">
                                {isPaidContent && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                      <Check className="h-3 w-3" />
                                      Débloqué
                                    </span>
                                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                                      <Euro className="h-3 w-3" />
                                      {message.price?.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="rounded-2xl overflow-hidden shadow-lg">
                                  {message.message_type === 'video' ? (
                                    <video
                                      controls
                                      className="w-full max-w-[280px] rounded-2xl"
                                      poster={message.media_thumbnail || undefined}
                                    >
                                      <source src={message.media_url} type="video/mp4" />
                                    </video>
                                  ) : (
                                    <motion.img
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      src={message.media_url}
                                      alt="Contenu exclusif"
                                      className="w-full max-w-[280px] rounded-2xl cursor-pointer hover:brightness-95 transition-all"
                                    />
                                  )}
                                </div>
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
                  {isSubscriberUpload ? (
                    /* Abonné envoie une demande */
                    <>
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Envoyer au créateur</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Le créateur fixera un prix pour voir votre {previewFile.type === 'video' ? 'vidéo' : 'photo'}
                      </p>
                      <Button
                        size="sm"
                        onClick={handleSendMedia}
                        disabled={isValidatingFile || sendMediaRequest.isPending}
                        className="w-full h-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                      >
                        {isValidatingFile || sendMediaRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Envoyer la demande
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    /* Créateur envoie du contenu payant */
                    <>
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
                          disabled={isValidatingFile || sendPaidContent.isPending}
                          className="flex-1 h-8 bg-gradient-to-r from-primary to-primary/80"
                        >
                          {isValidatingFile || sendPaidContent.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              {contentPrice}€
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de saisie compacte */}
      <div className="p-3 border-t border-border/30 bg-card">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
          "bg-muted/40 border",
          isFocused ? "border-primary/30" : "border-border/30"
        )}>
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />

          {isUserCreator ? (
            /* Bouton pour créateurs - contenu payant */
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
                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                title="Envoyer du contenu payant"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : (
            /* Bouton pour abonnés - envoyer une demande de média */
            <>
              <input
                ref={subscriberFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleSubscriberFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => subscriberFileInputRef.current?.click()}
                disabled={sendMediaRequest.isPending || isValidatingFile || !!previewFile}
                className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-500"
                title="Envoyer une photo/vidéo au créateur (payant)"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
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
            placeholder="Message..."
            disabled={sendMessage.isPending}
            className="flex-1 h-8 text-sm bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg transition-colors",
              newMessage.trim() 
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
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

      {/* Dialog pour fixer le prix d'une demande de média */}
      <AlertDialog open={requestPriceDialogOpen} onOpenChange={setRequestPriceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fixer un prix</AlertDialogTitle>
            <AlertDialogDescription>
              L'abonné devra payer ce montant pour que vous puissiez voir son contenu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3">
              <Euro className="h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                value={requestPrice === 0 ? '' : requestPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setRequestPrice('');
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      setRequestPrice(Math.min(500, Math.max(0, num)));
                    }
                  }
                }}
                min="1"
                max="500"
                className="flex-1"
                placeholder="Prix en euros"
              />
              <span className="text-muted-foreground">€</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAcceptRequest}
              disabled={!requestPrice || Number(requestPrice) < 1 || respondToMediaRequest.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {respondToMediaRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accepter pour {requestPrice || 0}€
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernPrivateChat;
