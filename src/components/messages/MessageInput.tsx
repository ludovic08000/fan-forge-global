/**
 * Zone de saisie de message avec emojis, upload média et indicateur de frappe
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Image, Video, X, Loader2, Euro, Upload } from 'lucide-react';
import { EmojiPicker } from '@/components/live/EmojiPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validatePrivateMessageFile } from '@/lib/fileValidation';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia?: (data: { mediaUrl: string; thumbnailUrl?: string; price: number; messageType: 'image' | 'video' }) => void;
  isSending: boolean;
  isCreator?: boolean;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  isSending,
  isCreator = false,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [mediaPrice, setMediaPrice] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!message.trim() || isSending) return;
    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valider le fichier
    const validation = await validatePrivateMessageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Fichier non valide');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    
    setPreviewFile({
      url,
      type: isVideo ? 'video' : 'image',
      file,
    });
    setShowPriceInput(true);
  };

  const handleCancelMedia = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    setShowPriceInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMedia = async () => {
    if (!previewFile || !onSendMedia) return;

    setIsUploading(true);
    try {
      // Upload vers Supabase Storage
      const fileName = `private/${Date.now()}-${previewFile.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, previewFile.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      // Envoyer le média
      onSendMedia({
        mediaUrl: publicUrl,
        price: mediaPrice,
        messageType: previewFile.type,
      });

      handleCancelMedia();
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur-sm p-3 md:p-4">
      {/* Preview média */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-muted rounded-xl"
          >
            <div className="flex gap-3">
              {/* Aperçu */}
              <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-background">
                {previewFile.type === 'video' ? (
                  <video src={previewFile.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={previewFile.url} alt="Aperçu" className="w-full h-full object-cover" />
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleCancelMedia}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Prix */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Prix du contenu</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={mediaPrice}
                    onChange={(e) => setMediaPrice(Number(e.target.value))}
                    min="1"
                    max="500"
                    className="w-24 h-9"
                  />
                  <span className="text-sm text-muted-foreground">€</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleSendMedia}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer ({mediaPrice}€)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de saisie */}
      <div className="flex items-center gap-2">
        {/* Emoji picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />

        {/* Bouton upload média (créateurs uniquement) */}
        {isCreator && onSendMedia && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !!previewFile}
              className="shrink-0 h-10 w-10"
            >
              <Upload className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Input message */}
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          disabled={disabled || isSending}
          className={cn(
            "flex-1 h-11 rounded-full px-4",
            "bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
          )}
        />

        {/* Bouton envoyer */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          size="icon"
          className={cn(
            "h-11 w-11 rounded-full shrink-0 transition-all",
            message.trim() 
              ? "bg-gradient-to-r from-primary to-primary-glow hover:scale-105 shadow-lg shadow-primary/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};