/**
 * Vue de chat premium - Style Instagram/iMessage 2025
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Video, MoreVertical, Sparkles, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ModernMessageBubble } from './ModernMessageBubble';
import { ModernMessageInput } from './ModernMessageInput';
import { useConversationMessages, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ModernChatViewProps {
  conversation: Conversation | null;
  onBack: () => void;
}

export const ModernChatView: React.FC<ModernChatViewProps> = ({ conversation, onBack }) => {
  const { userRole } = useAuth();
  const isCreator = userRole === 'creator';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    sendMessage,
    sendPaidMedia,
    unlockContent,
    deleteMessage,
  } = useConversationMessages(conversation?.participant_id || null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
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

  const handleDelete = (messageId: string) => {
    deleteMessage.mutate(messageId);
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  // Empty state - No conversation selected
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div 
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
            className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/10 shadow-2xl shadow-primary/10"
          >
            <MessageCircle className="h-12 w-12 text-primary" />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2">Vos Messages</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Sélectionnez une conversation pour commencer à échanger
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header premium */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-gradient-to-r from-background via-background to-muted/20 backdrop-blur-xl"
      >
        {/* Back button (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden shrink-0 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar with online indicator */}
        <div className="relative">
          <Avatar className="h-11 w-11 ring-2 ring-primary/20">
            <AvatarImage src={conversation.participant_avatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
              {conversation.participant_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background"
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-lg">
            {conversation.participant_stage_name || conversation.participant_name}
          </h2>
          <p className="text-xs text-green-500 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            En ligne
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex rounded-full hover:bg-muted">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex rounded-full hover:bg-muted">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </motion.header>

      {/* Messages area */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-muted/5 to-muted/10" ref={scrollRef}>
        <div className="p-4 space-y-1 min-h-full">
          {isLoading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className={`h-14 ${i % 2 === 0 ? 'w-52' : 'w-60'} rounded-2xl`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                <Sparkles className="h-9 w-9 text-primary/60" />
              </div>
              <p className="font-medium text-lg mb-1">Nouvelle conversation</p>
              <p className="text-muted-foreground text-sm max-w-xs">
                Envoyez un message pour démarrer la discussion avec {conversation.participant_name}
              </p>
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => {
                const showDateLabel =
                  index === 0 ||
                  !isSameDay(new Date(message.created_at), new Date(messages[index - 1].created_at));

                return (
                  <React.Fragment key={message.id}>
                    {showDateLabel && (
                      <div className="flex justify-center my-6">
                        <motion.span 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="px-4 py-1.5 rounded-full bg-muted/80 text-xs text-muted-foreground font-medium backdrop-blur-sm"
                        >
                          {getDateLabel(message.created_at)}
                        </motion.span>
                      </div>
                    )}
                    <ModernMessageBubble
                      message={message}
                      onUnlock={handleUnlock}
                      onDelete={handleDelete}
                      isUnlocking={unlockContent.isPending}
                      isDeleting={deleteMessage.isPending}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ModernMessageInput
        onSendMessage={handleSendMessage}
        onSendMedia={isCreator ? handleSendMedia : undefined}
        isSending={sendMessage.isPending}
        isCreator={isCreator}
        disabled={isLoading}
      />
    </div>
  );
};
