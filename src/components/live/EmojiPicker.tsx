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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="shrink-0">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="top" align="start">
        {/* Tabs de catégories */}
        <div className="flex gap-1 mb-2 border-b pb-2">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            >
              {categoryLabels[category as keyof typeof EMOJI_CATEGORIES]}
            </Button>
          ))}
        </div>
        
        {/* Grille d'émojis */}
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
            <Button
              key={`${emoji}-${index}`}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-lg hover:bg-muted"
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
