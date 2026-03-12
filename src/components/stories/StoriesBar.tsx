import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { toast } from 'sonner';

interface StoriesBarProps {
  creatorId?: string;
  forceCreatorId?: string | null;
}

interface StoryGroup {
  creator_id: string;
  stage_name: string;
  avatar_url: string | null;
  stories: any[];
}

/** Resolves R2 path or URL to displayable src */
const StoryImage: React.FC<{ url: string; className?: string; alt?: string; onClick?: () => void }> = ({ url, className, alt, onClick }) => {
  const needsR2 = isR2Url(url);
  const { secureUrl, loading } = useSecureR2Url(needsR2 ? url : null);
  const src = needsR2 ? secureUrl : url;

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <img src={src || ''} alt={alt || 'Story'} className={className} onClick={onClick} />;
};

export const StoriesBar: React.FC<StoriesBarProps> = ({ creatorId, forceCreatorId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');

  const { data: storyGroups } = useQuery({
    queryKey: ['stories-bar', creatorId],
    queryFn: async () => {
      let query = supabase
        .from('creator_stories')
        .select('*, creators!inner(id, stage_name, user_id)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (creatorId) query = query.eq('creator_id', creatorId);

      const { data, error } = await query;
      if (error) throw error;

      const groups: Record<string, StoryGroup> = {};
      for (const story of data || []) {
        const cid = story.creator_id;
        if (!groups[cid]) {
          groups[cid] = {
            creator_id: cid,
            stage_name: (story as any).creators?.stage_name || 'Créateur',
            avatar_url: null,
            stories: [],
          };
        }
        groups[cid].stories.push(story);
      }

      const userIds = [...new Set((data || []).map((s: any) => s.creators?.user_id).filter(Boolean))];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);
        for (const p of profiles || []) {
          const group = Object.values(groups).find(g =>
            (data || []).find((s: any) => s.creator_id === g.creator_id && s.creators?.user_id === p.user_id)
          );
          if (group) group.avatar_url = p.avatar_url;
        }
      }

      return Object.values(groups);
    },
    refetchInterval: 60000,
  });

  const { data: myCreator } = useQuery({
    queryKey: ['my-creator-for-stories', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('creators').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const canUpload = !!(myCreator?.id || forceCreatorId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const activeCreatorId = myCreator?.id || forceCreatorId;

    if (!file) return;
    if (!activeCreatorId) {
      toast.error('Profil créateur introuvable. Rechargez la page.');
      return;
    }

    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-upload', {
        body: (() => { const fd = new FormData(); fd.append('file', file); fd.append('folder', 'stories'); return fd; })(),
      });
      if (error) throw error;

      const uploadedUrl = data?.url || data?.filePath || data?.key;
      if (!uploadedUrl) throw new Error('Upload échoué');

      const { error: insertError } = await supabase.from('creator_stories').insert({
        creator_id: activeCreatorId,
        image_url: uploadedUrl,
        caption: caption.trim() || null,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      });

      if (insertError) throw insertError;

      toast.success('Story publiée ! 🎉');
      setShowUpload(false);
      setCaption('');
      // Reset file input
      e.target.value = '';
      queryClient.invalidateQueries({ queryKey: ['stories-bar'] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la publication');
    } finally {
      setUploading(false);
    }
  };

  const viewStory = (group: StoryGroup) => {
    setViewingGroup(group);
    setViewIndex(0);
    if (group.stories[0]) {
      supabase.rpc('record_story_view', { p_story_id: group.stories[0].id }).then(() => {});
    }
  };

  const nextStory = () => {
    if (!viewingGroup) return;
    if (viewIndex < viewingGroup.stories.length - 1) {
      const next = viewIndex + 1;
      setViewIndex(next);
      supabase.rpc('record_story_view', { p_story_id: viewingGroup.stories[next].id }).catch(() => {});
    } else {
      setViewingGroup(null);
    }
  };

  const prevStory = () => {
    if (!viewingGroup || viewIndex <= 0) return;
    setViewIndex(viewIndex - 1);
  };

  if (!user) return null;
  if (!storyGroups?.length && !canUpload) return null;

  const currentStory = viewingGroup?.stories[viewIndex];

  return (
    <>
      {/* Stories Bubbles */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {canUpload && (
          <button onClick={() => setShowUpload(true)} className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Ajouter</span>
          </button>
        )}

        {storyGroups?.map(group => (
          <button key={group.creator_id} onClick={() => viewStory(group)} className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-tr from-primary to-primary/50">
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={group.avatar_url || ''} />
                <AvatarFallback>{group.stage_name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs truncate max-w-16">{group.stage_name}</span>
          </button>
        ))}
      </div>

      {/* Story Viewer (fullscreen style) */}
      <Dialog open={!!viewingGroup} onOpenChange={() => setViewingGroup(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-black border-none [&>button]:hidden">
          {viewingGroup && currentStory && (
            <div className="relative select-none">
              {/* Progress bars */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                {viewingGroup.stories.map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                    <div className={`h-full bg-white rounded-full transition-all duration-300 ${i <= viewIndex ? 'w-full' : 'w-0'}`} />
                  </div>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); setViewingGroup(null); }}
                className="absolute top-6 right-3 z-20 p-1 rounded-full bg-black/40 hover:bg-black/60"
              >
                <X className="h-5 w-5 text-white" />
              </button>

              {/* Creator info */}
              <div className="absolute top-6 left-3 flex items-center gap-2 z-20">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={viewingGroup.avatar_url || ''} />
                  <AvatarFallback>{viewingGroup.stage_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-semibold drop-shadow">{viewingGroup.stage_name}</span>
              </div>

              {/* Navigation zones (tap left = prev, tap right = next) */}
              <div className="absolute inset-0 z-10 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full cursor-pointer" onClick={nextStory} />
              </div>

              {/* Story image with R2 resolution */}
              <StoryImage
                url={currentStory.image_url}
                className="w-full aspect-[9/16] object-cover"
                alt="Story"
              />

              {/* Caption */}
              {currentStory.caption && (
                <div className="absolute bottom-4 left-3 right-3 z-20">
                  <p className="text-white text-sm bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                    {currentStory.caption}
                  </p>
                </div>
              )}

              {/* Nav arrows (desktop) */}
              {viewIndex > 0 && (
                <button onClick={prevStory} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-black/40 hover:bg-black/60 hidden sm:block">
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}
              {viewIndex < viewingGroup.stories.length - 1 && (
                <button onClick={nextStory} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-black/40 hover:bg-black/60 hidden sm:block">
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Nouvelle story
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Légende (optionnel)</Label>
              <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Votre légende..." />
            </div>
            <div>
              <Label>Image</Label>
              <div className="mt-1">
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="text-sm" />
              </div>
            </div>
            {uploading && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Publication en cours...</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">La story disparaîtra automatiquement après 24h</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesBar;
