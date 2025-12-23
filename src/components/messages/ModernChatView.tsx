/**
 * Chat moderne style 2025 avec animations fluides et design premium
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Crown, 
  MoreVertical, 
  Phone, 
  Video, 
  Shield,
  Sparkles,
  Circle
} from 'lucide-react';
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
  const [isTyping, setIsTyping] = useState(false);
  
  const {
    messages,
    isLoading,
    sendMessage,
    sendPaidMedia,
    unlockContent,
  } = useConversationMessages(conversation?.participant_id || null);

  // Auto-scroll avec animation smooth
  useEffect(() => {
    if (scrollRef.current) {
      const element = scrollRef.current;
      element.scrollTo({
        top: element.scrollHeight,
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

  // Placeholder moderne
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Background gradient animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <motion.div 
          className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl"
          animate={{ 
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative z-10"
        >
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl shadow-primary/20">
              <Sparkles className="h-14 w-14 text-primary" />
            </div>
            <motion.div 
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Circle className="h-3 w-3 text-white fill-white" />
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 mt-8 space-y-2"
        >
          <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Vos Messages
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Sélectionnez une conversation pour commencer à échanger
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/30 relative overflow-hidden">
      {/* Header glassmorphism */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-white/5" />
        <div className="relative flex items-center gap-3 p-4">
          {/* Bouton retour mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden shrink-0 rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Avatar avec statut en ligne */}
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Avatar className="h-11 w-11 ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/50">
                <AvatarImage src={conversation.participant_avatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-sm">
                  {conversation.participant_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            {conversation.is_creator && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-full p-1 shadow-lg shadow-orange-500/30"
              >
                <Crown className="h-2.5 w-2.5 text-white" />
              </motion.div>
            )}
            {/* Indicateur en ligne */}
            <motion.div 
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">
                {conversation.participant_stage_name || conversation.participant_name}
              </h2>
              {conversation.is_creator && (
                <Shield className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
            <motion.p 
              className="text-xs text-emerald-500 font-medium flex items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              En ligne
            </motion.p>
          </div>

          {/* Actions header */}
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-full hover:bg-primary/10 hover:text-primary">
                <Phone className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-full hover:bg-primary/10 hover:text-primary">
                <Video className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Zone des messages avec pattern de fond */}
      <div className="flex-1 relative overflow-hidden">
        {/* Pattern de fond subtil */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-1 min-h-full">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div 
                    key={i} 
                    className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-52' : 'w-64'} rounded-3xl`} />
                  </motion.div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Commencez la conversation !
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Envoyez un message à {conversation.participant_name}
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
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex justify-center my-6"
                        >
                          <span className="px-4 py-1.5 rounded-full bg-muted/80 backdrop-blur-sm text-xs text-muted-foreground font-medium shadow-sm">
                            {getDateLabel(message.created_at)}
                          </span>
                        </motion.div>
                      )}
                      <ModernMessageBubble
                        message={message}
                        onUnlock={handleUnlock}
                        isUnlocking={unlockContent.isPending}
                      />
                    </React.Fragment>
                  );
                })}
                
                {/* Indicateur de frappe */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-muted-foreground/40"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ 
                              duration: 0.6, 
                              repeat: Infinity, 
                              delay: i * 0.15 
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {conversation.participant_name} écrit...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input moderne */}
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
