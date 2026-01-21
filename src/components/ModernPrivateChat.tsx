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

  // Déterminer si l'utilisateur est l'auteur d'un message (pour la suppression)
  const isMessageAuthor = (message: any) => {
    // Utiliser sender_id qui identifie clairement qui a envoyé le message
    return message.sender_id === user?.id;
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
    
    const recipientId = targetId || creatorId;
    if (!recipientId) {
      toast.error('Destinataire non trouvé');
      return;
    }
    
    try {
      await sendMessage.mutateAsync({ content: newMessage, creatorId: recipientId });
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
        // Créateur envoie du contenu payant - utiliser targetId (l'abonné)
        await sendPaidContent.mutateAsync({
          mediaUrl: publicUrl,
          price: Number(contentPrice) || 1,
          creatorId: targetId || creatorId,
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
      "flex flex-col overflow-hidden",
      fullScreen 
        ? "h-full bg-background" 
        : "h-[550px] rounded-2xl border border-border/50 shadow-xl bg-card"
    )}>
      {/* Header compact Instagram-style - masqué en mode plein écran */}
      {!fullScreen && (
        <div className="px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary via-pink-500 to-orange-400 rounded-full opacity-75" />
              <Avatar className="h-10 w-10 ring-2 ring-background relative">
                <AvatarImage src={creatorAvatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-sm">
                  {creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{creatorName}</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">En ligne</span>
              </div>
            </div>
            <Shield className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
      )}
      
      {/* Zone des messages */}
      <ScrollArea className="flex-1">
        <div>
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-8 w-8 text-primary/50 mb-4" />
              <p className="text-sm text-muted-foreground">Envoyez un message à {creatorName}</p>
            </div>
          ) : (
            messages?.map((message) => {
              const isFromMe = message.sender_id === user?.id;
              const canViewPaidContent = message.price === 0 || message.price === null || message.is_paid;
              const isPaidContent = (message.price ?? 0) > 0;
              const isDeleted = message.is_deleted;
              const canDelete = isMessageAuthor(message) && !isDeleted;
              const messageStatus = message.status || 'sent';
              const isMediaRequest = message.message_type === 'image_request' || message.message_type === 'video_request';
              const mediaRequestType = message.message_type === 'video_request' ? 'video' : 'image';
              const isRequestPending = isMediaRequest && messageStatus === 'pending';
              const isRequestPriceSet = isMediaRequest && messageStatus === 'price_set';
              const isRequestRejected = isMediaRequest && messageStatus === 'rejected';
              const isRequestPaid = isMediaRequest && message.is_paid;

              return (
                <div key={message.id} className="relative px-4 py-3 border-b border-border/30 hover:bg-muted/20 group">
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteMessage(message.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}

                  {isDeleted ? (
                    <p className="text-xs text-muted-foreground italic">Message supprimé</p>
                  ) : isMediaRequest ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Demande de {mediaRequestType}</span>
                      </div>
                      {isUserCreator && isRequestPending && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleRejectRequest(message.id)}>Refuser</Button>
                          <Button size="sm" onClick={() => handleAcceptRequest(message.id)}>Accepter</Button>
                        </div>
                      )}
                      {!isUserCreator && isRequestPriceSet && (
                        <Button size="sm" onClick={() => handlePayForRequest(message.id)}>Payer {message.price}€</Button>
                      )}
                    </div>
                  ) : message.message_type === 'text' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div>
                      {!canViewPaidContent ? (
                        <div className="relative w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                          <Lock className="h-6 w-6 text-muted-foreground" />
                          {/* Only subscriber can pay, not the creator who sent it */}
                          {!isUserCreator ? (
                            <Button size="sm" className="absolute bottom-2" onClick={() => handlePayForContent(message.id)}>
                              Débloquer {message.price}€
                            </Button>
                          ) : (
                            <span className="absolute bottom-2 text-xs text-muted-foreground">En attente de paiement</span>
                          )}
                        </div>
                      ) : (
                        message.message_type === 'video' ? (
                          <video controls className="w-48 rounded-lg"><source src={message.media_url || ''} /></video>
                        ) : (
                          <img src={message.media_url || ''} alt="" className="w-48 rounded-lg" />
                        )
                      )}
                    </div>
                  )}

                  {!isDeleted && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[11px] text-muted-foreground">{format(new Date(message.created_at), 'HH:mm', { locale: fr })}</span>
                      {isFromMe && (
                        message.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground" />
                        )
                      )}
                    </div>
                  )}
                </div>
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

      {/* Zone de saisie style Instagram/iMessage */}
      <div className="p-2 sm:p-3 border-t border-border/30 bg-background/80 backdrop-blur-xl safe-area-bottom">
        <motion.div 
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full transition-all duration-200",
            "bg-muted/50 dark:bg-muted/30",
            isFocused 
              ? "ring-2 ring-primary/20 bg-muted/70 dark:bg-muted/40" 
              : "ring-1 ring-border/40"
          )}
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ duration: 0.15 }}
        >
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
                className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                title="Envoyer du contenu payant"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
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
                className="h-9 w-9 rounded-full hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                title="Envoyer une photo/vidéo au créateur"
              >
                {isValidatingFile ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
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
            className="flex-1 h-9 text-[15px] bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 px-1"
          />
          
          <motion.div
            animate={{ 
              scale: newMessage.trim() ? 1 : 0.9,
              opacity: newMessage.trim() ? 1 : 0.5
            }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full transition-all duration-200",
                newMessage.trim() 
                  ? "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
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
