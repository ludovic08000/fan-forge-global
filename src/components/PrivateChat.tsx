import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Upload, Euro, Lock, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrivateChatProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ 
  creatorId, 
  creatorName, 
  creatorAvatar 
}) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, sendPaidContent, payForContent } = usePrivateMessages(creatorId);
  const [newMessage, setNewMessage] = useState('');
  const [contentPrice, setContentPrice] = useState(10);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendMessage.isPending) return;
    
    try {
      await sendMessage.mutateAsync({ content: newMessage, creatorId });
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast.error('Seules les images et vidéos sont acceptées');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
      toast.error('Le fichier est trop volumineux (max 100MB)');
      return;
    }

    try {
      // Upload du fichier vers Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      // Envoyer le contenu payant
      await sendPaidContent.mutateAsync({
        mediaUrl: publicUrl,
        price: contentPrice,
        creatorId,
        messageType: isVideo ? 'video' : 'image',
      });

      setShowPriceInput(false);
      toast.success('Contenu envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    }
  };

  const handlePayForContent = async (messageId: string) => {
    try {
      await payForContent.mutateAsync(messageId);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
    }
  };

  const isUserCreator = false; // Temporairement désactivé pour éviter les erreurs de type

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Chargement des messages...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={creatorAvatar} />
            <AvatarFallback>{creatorName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          Chat privé avec {creatorName}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages?.map((message) => {
            const isFromCreator = message.creator_id === creatorId;
            const canViewPaidContent = message.price === 0 || message.is_paid;
            
            return (
              <div
                key={message.id}
                className={`flex ${isFromCreator ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isFromCreator
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {message.message_type === 'text' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="space-y-2">
                      {message.price > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Euro className="w-3 h-3 mr-1" />
                          {message.price}€
                        </Badge>
                      )}
                      
                      {!canViewPaidContent ? (
                        <div className="flex flex-col items-center space-y-2 p-4 bg-muted/50 rounded">
                          <Lock className="w-8 h-8 text-muted-foreground" />
                          <p className="text-xs text-center text-muted-foreground">
                            Contenu payant - {message.price}€
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handlePayForContent(message.id)}
                            disabled={payForContent.isPending}
                          >
                            Débloquer pour {message.price}€
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {message.message_type === 'video' ? (
                            <div className="relative">
                              <video
                                controls
                                className="w-full rounded"
                                poster={message.media_thumbnail}
                              >
                                <source src={message.media_url} type="video/mp4" />
                              </video>
                            </div>
                          ) : (
                            <img
                              src={message.media_url}
                              alt="Contenu partagé"
                              className="w-full rounded"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input zone */}
        <div className="border-t p-4 space-y-3">
          {showPriceInput && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={contentPrice}
                onChange={(e) => setContentPrice(Number(e.target.value))}
                min="1"
                max="1000"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">€ pour le contenu</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPriceInput(false)}
              >
                Annuler
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={sendMessage.isPending}
            />
            
            {/* Bouton upload pour les créateurs */}
            {isUserCreator && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (showPriceInput) {
                      fileInputRef.current?.click();
                    } else {
                      setShowPriceInput(true);
                    }
                  }}
                  disabled={sendPaidContent.isPending}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivateChat;