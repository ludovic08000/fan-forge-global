/**
 * Page de messagerie moderne avec liste des conversations et chat
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ConversationList } from '@/components/messages/ConversationList';
import { ChatView } from '@/components/messages/ChatView';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

const Messages: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loadingConversations } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="min-h-screen flex flex-col bg-background pt-16">
      <main className="flex-1 flex overflow-hidden">
        <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-6xl">
          {/* Sidebar conversations */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "w-full md:w-80 lg:w-96 border-r flex flex-col bg-card/50",
              selectedConversation && "hidden md:flex"
            )}
          >
            {/* Header sidebar */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Messages</h1>
                  <p className="text-xs text-muted-foreground">
                    {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 h-10 rounded-full bg-muted/50 border-0"
                />
              </div>
            </div>

            {/* Liste des conversations */}
            <ConversationList
              conversations={filteredConversations}
              loading={loadingConversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
            />
          </motion.aside>

          {/* Zone de chat */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "flex-1 flex flex-col",
              !selectedConversation && "hidden md:flex"
            )}
          >
            <ChatView
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