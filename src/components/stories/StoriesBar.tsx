import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StoriesBarProps {
  creatorId?: string; // If provided, show only this creator's stories
  forceCreatorId?: string | null; // Optional fallback creator id (from dashboard)
}

interface StoryGroup {
  creator_id: string;
  stage_name: string;
  avatar_url: string | null;
  stories: any[];
}

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

      // Group by creator
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

      // Fetch avatars
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

  // Check if current user is a creator
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
    if (!file || !activeCreatorId) return;
    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-upload', {
        body: (() => { const fd = new FormData(); fd.append('file', file); fd.append('folder', 'stories'); return fd; })(),
      });
      if (error) throw error;

      await supabase.from('creator_stories').insert({
        creator_id: activeCreatorId,
        image_url: data.url || data.key,
        caption: caption.trim() || null,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      });

      toast.success('Story publiée !');
      setShowUpload(false);
      setCaption('');
      queryClient.invalidateQueries({ queryKey: ['stories-bar'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const viewStory = (group: StoryGroup) => {
    setViewingGroup(group);
    setViewIndex(0);
    // Record view
    if (group.stories[0]) {
      supabase.rpc('record_story_view', { p_story_id: group.stories[0].id }).then(() => {});
    }
  };

  const nextStory = () => {
    if (!viewingGroup) return;
    if (viewIndex < viewingGroup.stories.length - 1) {
      const next = viewIndex + 1;
      setViewIndex(next);
      supabase.rpc('record_story_view', { p_story_id: viewingGroup.stories[next].id }).then(() => {});
    } else {
      setViewingGroup(null);
    }
  };

  if (!user) return null;
  if (!storyGroups?.length && !myCreator) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {myCreator && (
          <button onClick={() => setShowUpload(true)} className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
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

      {/* Story Viewer */}
      <Dialog open={!!viewingGroup} onOpenChange={() => setViewingGroup(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-black">
          {viewingGroup && viewingGroup.stories[viewIndex] && (
            <div className="relative" onClick={nextStory}>
              {/* Progress */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                {viewingGroup.stories.map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                    <div className={`h-full bg-white rounded-full ${i <= viewIndex ? 'w-full' : 'w-0'}`} />
                  </div>
                ))}
              </div>

              {/* Creator info */}
              <div className="absolute top-6 left-3 flex items-center gap-2 z-10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={viewingGroup.avatar_url || ''} />
                  <AvatarFallback>{viewingGroup.stage_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-semibold">{viewingGroup.stage_name}</span>
              </div>

              <img
                src={viewingGroup.stories[viewIndex].image_url}
                alt="Story"
                className="w-full aspect-[9/16] object-cover cursor-pointer"
              />

              {viewingGroup.stories[viewIndex].caption && (
                <div className="absolute bottom-4 left-3 right-3 z-10">
                  <p className="text-white text-sm bg-black/50 rounded-lg px-3 py-2">
                    {viewingGroup.stories[viewIndex].caption}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Nouvelle story</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Légende (optionnel)</Label><Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Votre légende..." /></div>
            <div>
              <Label>Image</Label>
              <div className="mt-1">
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="text-sm" />
              </div>
            </div>
            {uploading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            <p className="text-xs text-muted-foreground">La story disparaîtra automatiquement après 24h</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesBar;
