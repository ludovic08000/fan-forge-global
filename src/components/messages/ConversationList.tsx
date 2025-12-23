/**
 * Liste des conversations avec aperçu du dernier message
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, Video, MessageCircle, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelect,
}) => {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"
        >
          <MessageCircle className="h-10 w-10 text-muted-foreground" />
        </motion.div>
        <h3 className="font-semibold text-lg mb-1">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground">
          Vos conversations apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <AnimatePresence mode="popLayout">
          {conversations.map((conversation, index) => (
            <motion.button
              key={conversation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(conversation)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left",
                "hover:bg-muted/80 hover:scale-[1.02]",
                selectedId === conversation.id 
                  ? "bg-primary/10 ring-1 ring-primary/30" 
                  : "bg-transparent"
              )}
            >
              {/* Avatar avec indicateur créateur */}
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  <AvatarImage src={conversation.participant_avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-semibold">
                    {conversation.participant_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {conversation.is_creator && (
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-1">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">
                    {conversation.participant_stage_name || conversation.participant_name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(conversation.last_message_time), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Icône du type de message */}
                  {conversation.last_message_type === 'image' && (
                    <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  {conversation.last_message_type === 'video' && (
                    <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message || 'Nouveau message'}
                  </p>
                </div>
              </div>

              {/* Badge non lu */}
              {conversation.unread_count > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {conversation.unread_count}
                </Badge>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};