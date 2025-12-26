/**
 * Vue de chat premium - Design épuré style iMessage/WhatsApp
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Video, MoreVertical, Sparkles } from 'lucide-react';
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

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Vos Messages</h3>
          <p className="text-muted-foreground max-w-sm">
            Sélectionnez une conversation pour commencer à échanger
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm"
      >
        {/* Back button (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.participant_avatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-sm">
              {conversation.participant_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {conversation.participant_stage_name || conversation.participant_name}
          </h2>
          <p className="text-xs text-green-500 font-medium">En ligne</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </motion.header>

      {/* Messages area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-1 min-h-full">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-2xl`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Commencez la conversation avec {conversation.participant_name}
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
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                          {getDateLabel(message.created_at)}
                        </span>
                      </div>
                    )}
                    <ModernMessageBubble
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