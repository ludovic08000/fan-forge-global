/**
 * Page de messagerie ultra premium 2025 - Style Instagram/Snapchat
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ModernChatView } from '@/components/messages/ModernChatView';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Messages: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loadingConversations, deleteConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.participant_stage_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation.mutate(conversationToDelete.participant_id);
      if (selectedConversation?.participant_id === conversationToDelete.participant_id) {
        setSelectedConversation(null);
      }
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  return (
    <div className="h-screen flex bg-background pt-16">
      {/* Sidebar conversations - Style Instagram */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "w-full md:w-80 lg:w-96 flex flex-col",
          "bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-xl border-r border-border/30",
          selectedConversation && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Messages
          </h1>
          
          {/* Search bar style Instagram */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-destructive/10"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loadingConversations ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3"
                  >
                    <Skeleton className="h-14 w-14 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                  <MessageCircle className="h-9 w-9 text-primary/60" />
                </div>
                <p className="font-semibold text-lg">Aucune conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vos messages apparaîtront ici
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl cursor-pointer group transition-all duration-200",
                      selectedConversation?.id === conversation.id
                        ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent"
                        : "hover:bg-muted/60"
                    )}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    {/* Selection indicator */}
                    {selectedConversation?.id === conversation.id && (
                      <motion.div
                        layoutId="selectedIndicator"
                        className="absolute left-0 w-1 h-10 rounded-r-full bg-gradient-to-b from-primary to-primary/60"
                      />
                    )}

                    {/* Avatar avec indicateur en ligne */}
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        "h-14 w-14 rounded-2xl ring-2 transition-all",
                        selectedConversation?.id === conversation.id 
                          ? "ring-primary/50" 
                          : "ring-border/30 group-hover:ring-border/50"
                      )}>
                        <AvatarImage src={conversation.participant_avatar} className="object-cover" />
                        <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-lg">
                          {conversation.participant_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-[3px] border-background"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn(
                          "font-bold truncate text-[15px]",
                          selectedConversation?.id === conversation.id && "text-primary"
                        )}>
                          {conversation.participant_stage_name || conversation.participant_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2 font-medium">
                          {formatDistanceToNow(new Date(conversation.last_message_time), {
                            addSuffix: false,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message || 'Nouveau message'}
                      </p>
                    </div>

                    {/* Bouton supprimer - TOUJOURS VISIBLE */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
                      onClick={(e) => handleDeleteClick(e, conversation)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </motion.aside>

      {/* Chat area - Right side */}
      <div className={cn(
        "flex-1 flex flex-col bg-background",
        !selectedConversation && "hidden md:flex"
      )}>
        <ModernChatView
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Tous les messages seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-11"
              disabled={deleteConversation.isPending}
            >
              {deleteConversation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-xl h-11 mt-0">
              Annuler
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
