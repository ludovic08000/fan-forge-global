/**
 * Zone de saisie premium - Design épuré
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Image, Video, X, Loader2, Euro, Paperclip, Smile } from 'lucide-react';
import { EmojiPicker } from '@/components/live/EmojiPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validatePrivateMessageFile } from '@/lib/fileValidation';
import { cn } from '@/lib/utils';

interface ModernMessageInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia?: (data: { mediaUrl: string; thumbnailUrl?: string; price: number; messageType: 'image' | 'video' }) => void;
  isSending: boolean;
  isCreator?: boolean;
  disabled?: boolean;
}

export const ModernMessageInput: React.FC<ModernMessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  isSending,
  isCreator = false,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
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
  };

  const handleCancelMedia = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMedia = async () => {
    if (!previewFile || !onSendMedia) return;

    setIsUploading(true);
    try {
      const fileName = `private/${Date.now()}-${previewFile.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, previewFile.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      onSendMedia({
        mediaUrl: publicUrl,
        price: mediaPrice,
        messageType: previewFile.type,
      });

      handleCancelMedia();
      toast.success('Contenu envoyé !');
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-t border-border/50 bg-background p-4">
      {/* Media preview */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-muted/50 rounded-xl"
          >
            <div className="flex gap-3">
              {/* Preview */}
              <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-background shrink-0">
                {previewFile.type === 'video' ? (
                  <video src={previewFile.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={previewFile.url} alt="Aperçu" className="w-full h-full object-cover" />
                )}
                
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                  {previewFile.type === 'video' ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                </div>
                
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-5 w-5 rounded-full"
                  onClick={handleCancelMedia}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Price config */}
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Prix du contenu</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      type="number"
                      value={mediaPrice}
                      onChange={(e) => setMediaPrice(Number(e.target.value))}
                      min="1"
                      max="500"
                      className="w-20 h-9 pl-6 text-sm"
                    />
                    <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  
                  <Button
                    onClick={handleSendMedia}
                    disabled={isUploading}
                    size="sm"
                    className="flex-1"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex items-center gap-2">
        {/* Emoji */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />

        {/* Media upload (creators only) */}
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
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !!previewFile}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Text input */}
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez un message..."
          disabled={disabled || isSending}
          className="flex-1 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          size="icon"
          className={cn(
            "shrink-0 rounded-full transition-colors",
            message.trim() 
              ? "bg-primary hover:bg-primary/90" 
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