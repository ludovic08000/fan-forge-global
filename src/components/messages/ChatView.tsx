/**
 * Vue principale du chat avec messages et input
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Crown, MoreVertical, Phone, Video } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useConversationMessages, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';

interface ChatViewProps {
  conversation: Conversation | null;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversation, onBack }) => {
  const { userRole } = useAuth();
  const isCreator = userRole === 'creator';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    sendMessage,
    sendPaidMedia,
    unlockContent,
  } = useConversationMessages(conversation?.participant_id || null);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage.mutate(content);
  };

  const handleSendMedia = (data: { mediaUrl: string; thumbnailUrl?: string; price: number; messageType: 'image' | 'video' }) => {
    sendPaidMedia.mutate(data);
  };

  const handleUnlock = (messageId: string) => {
    unlockContent.mutate(messageId);
  };

  // Grouper les messages par date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  // Placeholder si aucune conversation sélectionnée
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/30">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4"
        >
          <Video className="h-12 w-12 text-primary/50" />
        </motion.div>
        <h3 className="text-xl font-semibold mb-2">Messagerie Crub</h3>
        <p className="text-muted-foreground max-w-sm">
          Sélectionnez une conversation pour commencer à discuter
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header du chat */}
      <div className="flex items-center gap-3 p-3 md:p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        {/* Bouton retour mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar et nom */}
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={conversation.participant_avatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-semibold">
              {conversation.participant_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {conversation.is_creator && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-0.5">
              <Crown className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {conversation.participant_stage_name || conversation.participant_name}
          </h2>
          <p className="text-xs text-muted-foreground">En ligne</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Zone des messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-1">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-2xl`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Commencez la conversation avec {conversation.participant_name}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const showDateLabel =
                  index === 0 ||
                  !isSameDay(new Date(message.created_at), new Date(messages[index - 1].created_at));

                return (
                  <React.Fragment key={message.id}>
                    {showDateLabel && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center my-4"
                      >
                        <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                          {getDateLabel(message.created_at)}
                        </span>
                      </motion.div>
                    )}
                    <MessageBubble
                      message={message}
                      onUnlock={handleUnlock}
                      isUnlocking={unlockContent.isPending}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendMedia={isCreator ? handleSendMedia : undefined}
        isSending={sendMessage.isPending}
        isCreator={isCreator}
        disabled={isLoading}
      />
    </div>
  );
};