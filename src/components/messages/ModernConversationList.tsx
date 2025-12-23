/**
 * Liste des conversations moderne 2025 avec animations et effets premium
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Image, 
  Video, 
  MessageCircle, 
  Crown, 
  Sparkles,
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface ModernConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export const ModernConversationList: React.FC<ModernConversationListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelect,
}) => {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div 
            key={i} 
            className="flex items-center gap-3 p-3 rounded-2xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center relative overflow-hidden">
        {/* Background animé */}
        <motion.div 
          className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative z-10"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-6 space-y-1"
        >
          <h3 className="font-bold text-lg">Aucune conversation</h3>
          <p className="text-sm text-muted-foreground">
            Vos échanges apparaîtront ici
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {conversations.map((conversation, index) => (
            <motion.button
              key={conversation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => onSelect(conversation)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 text-left group relative overflow-hidden",
                selectedId === conversation.id 
                  ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent" 
                  : "hover:bg-muted/80"
              )}
            >
              {/* Indicateur sélection */}
              <AnimatePresence>
                {selectedId === conversation.id && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0 }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-primary to-primary/60"
                  />
                )}
              </AnimatePresence>
              
              {/* Avatar avec indicateurs */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Avatar className={cn(
                    "h-14 w-14 rounded-2xl ring-2 transition-all duration-300",
                    selectedId === conversation.id 
                      ? "ring-primary/50" 
                      : "ring-border/50 group-hover:ring-border"
                  )}>
                    <AvatarImage src={conversation.participant_avatar} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                      {conversation.participant_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                
                {/* Badge créateur */}
                {conversation.is_creator && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-lg p-1 shadow-lg shadow-orange-500/30"
                  >
                    <Crown className="h-3 w-3 text-white" />
                  </motion.div>
                )}
                
                {/* Indicateur en ligne */}
                <motion.div 
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-background flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Circle className="h-2 w-2 text-white fill-white" />
                </motion.div>
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={cn(
                    "font-semibold truncate transition-colors",
                    selectedId === conversation.id && "text-primary"
                  )}>
                    {conversation.participant_stage_name || conversation.participant_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">
                    {formatDistanceToNow(new Date(conversation.last_message_time), {
                      addSuffix: false,
                      locale: fr,
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Icône type de message */}
                  {conversation.last_message_type === 'image' && (
                    <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  {conversation.last_message_type === 'video' && (
                    <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  
                  <p className={cn(
                    "text-sm truncate transition-colors",
                    conversation.unread_count > 0 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground"
                  )}>
                    {conversation.last_message || 'Nouveau message'}
                  </p>
                </div>
              </div>

              {/* Badge non lu */}
              <AnimatePresence>
                {conversation.unread_count > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs px-2.5 py-1 rounded-full font-bold shadow-lg shadow-primary/30 min-w-[24px] flex items-center justify-center">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};
