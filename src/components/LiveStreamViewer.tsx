/**
 * Composant pour regarder un live stream
 * Interface de visionnage pour les spectateurs
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Send, Circle, Heart } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LiveStreamViewerProps {
  streamId: string;
}

/**
 * Lecteur de live stream pour spectateurs
 */
export const LiveStreamViewer = ({ streamId }: LiveStreamViewerProps) => {
  const { user } = useAuth();
  const { joinLiveStream, leaveLiveStream } = useLiveStream();
  const { messages, sendMessage } = useLiveChat(streamId);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [likes, setLikes] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Rejoindre le live au montage du composant
   */
  useEffect(() => {
    if (user) {
      joinLiveStream(streamId);
    }

    return () => {
      if (user) {
        leaveLiveStream(streamId);
      }
    };
  }, [streamId, user]);

  /**
   * Auto-scroll vers le dernier message
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Envoyer un message dans le chat
   */
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    if (!user) {
      toast.error('Connectez-vous pour participer au chat');
      return;
    }

    sendMessage(newMessage);
    setNewMessage('');
  };

  /**
   * Liker le live
   */
  const handleLike = () => {
    if (!user) {
      toast.error('Connectez-vous pour liker');
      return;
    }
    setLikes(likes + 1);
    toast.success('❤️');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Lecteur vidéo */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Badge EN DIRECT */}
                <div className="absolute top-4 left-4">
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="h-2 w-2 fill-current" />
                    EN DIRECT
                  </Badge>
                </div>

                {/* Compteur de spectateurs */}
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{viewerCount}</span>
                </div>

                {/* Bouton like flottant */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-4 right-4 rounded-full"
                  onClick={handleLike}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Titre du live</h1>
                  <p className="text-muted-foreground">Description du live stream...</p>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>CR</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Nom du créateur</p>
                    <p className="text-sm text-muted-foreground">1.2K abonnés</p>
                  </div>
                  <Button variant="default" className="ml-auto">
                    S'abonner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat en direct */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Chat en direct</span>
              <Badge variant="secondary">{messages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {msg.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm truncate">
                            {msg.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input message */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder={user ? 'Envoyer un message...' : 'Connectez-vous pour participer'}
                  disabled={!user}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!user || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
