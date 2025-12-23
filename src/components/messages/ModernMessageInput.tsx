/**
 * Zone de saisie moderne 2025 avec animations fluides et design premium
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Image, 
  Video, 
  X, 
  Loader2, 
  Euro, 
  Paperclip,
  Smile,
  Mic,
  Sparkles
} from 'lucide-react';
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
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [mediaPrice, setMediaPrice] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
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
      const fileName = `private/${Date.now()}-${previewFile.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      toast.success('Contenu envoyé avec succès !', {
        icon: <Sparkles className="h-4 w-4" />
      });
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative z-20">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-white/5" />
      
      <div className="relative p-4">
        {/* Preview média moderne */}
        <AnimatePresence>
          {previewFile && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              className="mb-4 p-4 bg-gradient-to-br from-muted/80 to-muted/50 backdrop-blur-sm rounded-2xl border border-border/50"
            >
              <div className="flex gap-4">
                {/* Aperçu avec overlay */}
                <motion.div 
                  className="relative w-28 h-28 rounded-xl overflow-hidden bg-background shadow-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  {previewFile.type === 'video' ? (
                    <video src={previewFile.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewFile.url} alt="Aperçu" className="w-full h-full object-cover" />
                  )}
                  
                  {/* Badge type */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                    {previewFile.type === 'video' ? (
                      <Video className="h-3 w-3 text-white" />
                    ) : (
                      <Image className="h-3 w-3 text-white" />
                    )}
                  </div>
                  
                  {/* Bouton supprimer */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full shadow-lg"
                      onClick={handleCancelMedia}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Configuration prix */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <Euro className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Prix du contenu</p>
                      <p className="text-xs text-muted-foreground">Définissez le prix de déblocage</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Input
                        type="number"
                        value={mediaPrice}
                        onChange={(e) => setMediaPrice(Number(e.target.value))}
                        min="1"
                        max="500"
                        className="w-24 h-10 pl-8 rounded-xl bg-background/50 border-border/50 font-semibold"
                      />
                      <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={handleSendMedia}
                        disabled={isUploading}
                        className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 font-semibold"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Envoyer ({mediaPrice}€)
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone de saisie principale */}
        <motion.div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-2xl transition-all duration-300",
            "bg-muted/50 border",
            isFocused 
              ? "border-primary/50 shadow-lg shadow-primary/10" 
              : "border-transparent"
          )}
          animate={{ 
            boxShadow: isFocused ? '0 0 30px rgba(var(--primary), 0.1)' : 'none' 
          }}
        >
          {/* Emoji picker */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </motion.div>

          {/* Bouton upload média (créateurs) */}
          {isCreator && onSendMedia && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || !!previewFile}
                  className="shrink-0 h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </motion.div>
            </>
          )}

          {/* Input message */}
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Écrivez votre message..."
            disabled={disabled || isSending}
            className={cn(
              "flex-1 h-11 rounded-xl px-4 text-[15px]",
              "bg-transparent border-0",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground/50"
            )}
          />

          {/* Bouton micro (décoratif) */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Mic className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Bouton envoyer */}
          <motion.div 
            whileHover={{ scale: message.trim() ? 1.05 : 1 }} 
            whileTap={{ scale: message.trim() ? 0.95 : 1 }}
          >
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isSending || disabled}
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full shrink-0 transition-all duration-300",
                message.trim() 
                  ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              )}
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <motion.div
                  animate={{ 
                    rotate: message.trim() ? 0 : 0,
                    scale: message.trim() ? 1 : 0.9
                  }}
                >
                  <Send className={cn(
                    "h-5 w-5 transition-transform",
                    message.trim() && "-rotate-45"
                  )} />
                </motion.div>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
