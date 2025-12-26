/**
 * Page de messagerie moderne 2025 avec design premium et animations fluides
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search, Sparkles, Settings2, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModernConversationList } from '@/components/messages/ModernConversationList';
import { ModernChatView } from '@/components/messages/ModernChatView';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Messages: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loadingConversations, deleteConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Redirection si non connecté
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Filtrer les conversations par recherche
  const filteredConversations = conversations.filter((conv) =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.participant_stage_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleDeleteConversation = (participantId: string) => {
    deleteConversation.mutate(participantId);
    if (selectedConversation?.participant_id === participantId) {
      setSelectedConversation(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pt-16 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>
      
      <main className="flex-1 flex overflow-hidden relative z-10">
        <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-7xl">
          {/* Sidebar conversations - design glassmorphism */}
          <motion.aside
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "w-full md:w-[340px] lg:w-[380px] flex flex-col relative",
              "bg-card/30 backdrop-blur-xl",
              "border-r border-white/5",
              selectedConversation && "hidden md:flex"
            )}
          >
            {/* Header sidebar premium */}
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                      <MessageCircle className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <motion.div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-background"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                  <div>
                    <h1 className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Messages
                    </h1>
                    <p className="text-xs text-muted-foreground font-medium">
                      {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Actions header */}
                <div className="flex items-center gap-1">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                      <Edit3 className="h-5 w-5" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                      <Settings2 className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Barre de recherche moderne */}
              <motion.div 
                className={cn(
                  "relative transition-all duration-300",
                  isSearchFocused && "scale-[1.02]"
                )}
              >
                <Search className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                  isSearchFocused ? "text-primary" : "text-muted-foreground"
                )} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Rechercher une conversation..."
                  className={cn(
                    "pl-11 h-12 rounded-2xl text-sm",
                    "bg-muted/50 border-0",
                    "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-muted/80",
                    "placeholder:text-muted-foreground/50",
                    "transition-all duration-300"
                  )}
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Effacer
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Liste des conversations */}
            <ModernConversationList
              conversations={filteredConversations}
              loading={loadingConversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              isDeleting={deleteConversation.isPending}
            />
          </motion.aside>

          {/* Zone de chat - design moderne */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex-1 flex flex-col relative",
              "bg-gradient-to-br from-background via-background to-muted/20",
              !selectedConversation && "hidden md:flex"
            )}
          >
            <ModernChatView
              conversation={selectedConversation}
              onBack={handleBack}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
