/**
 * Composant sélecteur d'émojis pour le chat
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="dark"
          locale="fr"
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  );
};
