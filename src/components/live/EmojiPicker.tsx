/**
 * Composant sélecteur d'émojis simplifié pour le chat
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

// Liste d'émojis populaires organisés par catégorie
const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  gestures: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶'],
  fire: ['🔥', '💯', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎯', '🎪'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🧇', '🥞', '🥓', '🥩', '🍗', '🍖', '🌮', '🌯', '🥗', '🍜', '🍝', '🍣', '🍱', '🍤', '🍙', '🍚', '🍘', '🍥', '🥮', '🍡', '🥟', '🍰', '🎂', '🧁', '🍨', '🍧', '🍦', '☕', '🍵', '🧃', '🥤', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉'],
};

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  const categoryLabels: Record<keyof typeof EMOJI_CATEGORIES, string> = {
    smileys: '😀',
    hearts: '❤️',
    gestures: '👍',
    fire: '🔥',
    animals: '🐶',
    food: '🍕',
  };

  // Détecter mobile
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="shrink-0 h-10 w-10">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`p-2 ${isMobile ? 'w-[90vw] max-w-[320px]' : 'w-80'}`} 
        side="top" 
        align="start"
        sideOffset={8}
      >
        {/* Tabs de catégories */}
        <div className="flex gap-1 mb-2 border-b pb-2 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'secondary' : 'ghost'}
              size="sm"
              className={`p-0 shrink-0 ${isMobile ? 'h-10 w-10 text-xl' : 'h-8 w-8 text-base'}`}
              onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            >
              {categoryLabels[category as keyof typeof EMOJI_CATEGORIES]}
            </Button>
          ))}
        </div>
        
        {/* Grille d'émojis - plus grande sur mobile */}
        <div className={`grid gap-1 overflow-y-auto ${isMobile ? 'grid-cols-6 max-h-60' : 'grid-cols-8 max-h-48'}`}>
          {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
            <Button
              key={`${emoji}-${index}`}
              variant="ghost"
              size="sm"
              className={`p-0 hover:bg-muted ${isMobile ? 'h-11 w-11 text-2xl' : 'h-8 w-8 text-lg'}`}
              onClick={() => handleEmojiSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
