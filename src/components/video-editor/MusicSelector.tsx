import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Music, 
  Upload, 
  Play, 
  Pause, 
  X, 
  Volume2,
  Library
} from 'lucide-react';
import { MusicSettings } from '@/hooks/useVideoEditor';
import { validateFile } from '@/lib/fileValidation';
import { toast } from 'sonner';

interface MusicSelectorProps {
  music: MusicSettings | null;
  videoDuration: number;
  trimStart: number;
  trimEnd: number;
  onMusicChange: (settings: MusicSettings | null) => void;
}

// Sample music library (placeholder - would come from storage in production)
const SAMPLE_MUSIC = [
  { id: 'upbeat1', name: 'Upbeat Energy', duration: 120 },
  { id: 'chill1', name: 'Chill Vibes', duration: 180 },
  { id: 'epic1', name: 'Epic Cinematic', duration: 90 },
  { id: 'acoustic1', name: 'Acoustic Morning', duration: 150 },
];

const MusicSelector: React.FC<MusicSelectorProps> = ({
  music,
  videoDuration,
  trimStart,
  trimEnd,
  onMusicChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [showLibrary, setShowLibrary] = useState(false);

  const isEnabled = music !== null;
  const trimmedDuration = trimEnd - trimStart;

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onMusicChange({
        file: null,
        url: null,
        volume: 50,
        fadeIn: true,
        fadeOut: true,
        startOffset: 0
      });
    } else {
      onMusicChange(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl('');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate audio file
    const validation = await validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Fichier audio non valide');
      return;
    }

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }

    // Clean up previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    onMusicChange({
      ...(music || { volume: 50, fadeIn: true, fadeOut: true, startOffset: 0 }),
      file,
      url
    });

    toast.success('Musique ajoutée');
  };

  const handleLibrarySelect = (trackId: string) => {
    // In production, this would fetch the actual audio URL from storage
    const track = SAMPLE_MUSIC.find(t => t.id === trackId);
    if (!track) return;

    onMusicChange({
      ...(music || { volume: 50, fadeIn: true, fadeOut: true, startOffset: 0 }),
      file: null,
      url: `/audio/${trackId}.mp3` // Placeholder URL
    });

    setShowLibrary(false);
    toast.success(`Musique "${track.name}" sélectionnée`);
  };

  const togglePlayPreview = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const updateField = <K extends keyof MusicSettings>(
    field: K,
    value: MusicSettings[K]
  ) => {
    if (!music) return;
    onMusicChange({ ...music, [field]: value });
  };

  const removeMusic = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    onMusicChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Music className="h-4 w-4" />
        <span>Ajoutez une musique de fond à votre vidéo</span>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <span className="font-medium">Ajouter de la musique</span>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      </div>

      {isEnabled && music && (
        <>
          {/* Audio Source Selection */}
          <div className="space-y-3">
            <Label>Source audio</Label>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Uploader
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLibrary(!showLibrary)}
              >
                <Library className="h-4 w-4 mr-2" />
                Bibliothèque
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/aac"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Library (simplified placeholder) */}
          {showLibrary && (
            <div className="border rounded-lg divide-y">
              {SAMPLE_MUSIC.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleLibrarySelect(track.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>{track.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </button>
              ))}
              <div className="p-3 text-center text-sm text-muted-foreground bg-muted">
                Bibliothèque de démonstration - Uploadez votre propre musique
              </div>
            </div>
          )}

          {/* Selected Music Preview */}
          {(music.file || music.url) && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPreview}
                disabled={!audioUrl}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {music.file?.name || 'Musique sélectionnée'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sera ajoutée à votre vidéo
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={removeMusic}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Label>Volume</Label>
              </div>
              <span className="text-sm font-mono">{music.volume}%</span>
            </div>
            <Slider
              value={[music.volume]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => updateField('volume', value)}
            />
          </div>

          {/* Fade Options */}
          <div className="space-y-3">
            <Label>Transitions</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={music.fadeIn}
                  onCheckedChange={(checked) => updateField('fadeIn', checked)}
                />
                <span className="text-sm">Fade In</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={music.fadeOut}
                  onCheckedChange={(checked) => updateField('fadeOut', checked)}
                />
                <span className="text-sm">Fade Out</span>
              </label>
            </div>
          </div>

          {/* Start Offset */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Décalage de début (dans la musique)</Label>
              <span className="font-mono">{music.startOffset}s</span>
            </div>
            <Slider
              value={[music.startOffset]}
              min={0}
              max={60}
              step={1}
              onValueChange={([value]) => updateField('startOffset', value)}
            />
            <p className="text-xs text-muted-foreground">
              Commencer la musique à partir de {music.startOffset} secondes
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p>
              La musique sera mixée avec la vidéo de {trimmedDuration.toFixed(1)}s.
              Le traitement final se fait côté serveur.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicSelector;
