import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Save, User, Gift, Camera, Loader2, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AccountDeletion from '@/components/settings/AccountDeletion';
import CreatorAccountPause from '@/components/creator/CreatorAccountPause';
import ProfilePreviewDialog from '@/components/creator/ProfilePreviewDialog';

interface CreatorProfile {
  id: string;
  stage_name: string | null;
  category: string | null;
  is_accepting_tips: boolean;
  subscription_price: number | null;
  currency: string | null;
  total_subscribers: number | null;
  total_content: number | null;
}

interface UserProfileData {
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
}

const CreatorSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  
  const [formData, setFormData] = useState({
    stageName: '',
    category: '',
    isAcceptingTips: true
  });

  const categories = [
    'Art & Design',
    'Musique',
    'Vidéo & Film',
    'Photographie',
    'Écriture',
    'Cuisine',
    'Fitness & Sport',
    'Mode & Beauté',
    'Technologie',
    'Éducation',
    'Divertissement',
    'Publication érotique',
    'Autre'
  ];

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        // Load creator profile
        const { data, error } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProfile(data);
          setFormData({
            stageName: data.stage_name || '',
            category: data.category || '',
            isAcceptingTips: data.is_accepting_tips
          });
        }

        // Load user profile for avatar/cover/bio
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url, cover_url, bio, is_verified')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La taille maximale est de 5 Mo");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setUserProfile(prev => ({ ...prev, avatar_url: `${urlData.publicUrl}?t=${Date.now()}`, cover_url: prev?.cover_url || null }));
      toast.success("Photo de profil mise à jour");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La taille maximale est de 10 Mo");
      return;
    }

    setUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setUserProfile(prev => ({ ...prev, cover_url: `${urlData.publicUrl}?t=${Date.now()}`, avatar_url: prev?.avatar_url || null }));
      toast.success("Photo de couverture mise à jour");
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const updateData = {
        stage_name: formData.stageName || null,
        category: formData.category || null,
        is_accepting_tips: formData.isAcceptingTips
      };

      if (profile) {
        const { error } = await supabase
          .from('creators')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Profil mis à jour');
      } else {
        const { error } = await supabase
          .from('creators')
          .insert({
            user_id: user.id,
            ...updateData
          });

        if (error) throw error;
        toast.success('Profil créateur créé');
        
        const { data } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) setProfile(data);
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Photos de profil */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Photos du profil
            </CardTitle>
            <ProfilePreviewDialog
              stageName={formData.stageName}
              category={formData.category}
              avatarUrl={userProfile?.avatar_url || null}
              coverUrl={userProfile?.cover_url || null}
              subscriptionPrice={profile?.subscription_price || 0}
              currency={profile?.currency || 'EUR'}
              isVerified={userProfile?.is_verified || false}
              bio={userProfile?.bio || ''}
              totalSubscribers={profile?.total_subscribers || 0}
              totalContent={profile?.total_content || 0}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo de couverture */}
          <div className="space-y-2">
            <Label>Photo de couverture</Label>
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden group">
              {userProfile?.cover_url ? (
                <img 
                  src={userProfile.cover_url} 
                  alt="Couverture" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingCover ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <div className="flex items-center gap-2 text-white">
                    <Camera className="h-5 w-5" />
                    <span className="text-sm font-medium">Modifier</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Taille recommandée : 1500x500px. Max 10 Mo.
            </p>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <Label>Photo de profil</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile?.avatar_url || ''} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 cursor-pointer">
                  <div className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>JPG, PNG ou WebP</p>
                <p>Max 5 Mo</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil créateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nom de scène</Label>
              <Input
                id="stageName"
                placeholder="Votre nom d'artiste"
                value={formData.stageName}
                onChange={(e) => setFormData(prev => ({ ...prev, stageName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <Label htmlFor="acceptTips">Pourboires</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepter les pourboires de vos fans
                </p>
              </div>
              <Switch
                id="acceptTips"
                checked={formData.isAcceptingTips}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAcceptingTips: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          disabled={saving}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </form>

      <Separator />
      
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Gestion du compte</h4>
        
        {profile?.id && (
          <CreatorAccountPause creatorId={profile.id} />
        )}
        
        <AccountDeletion isCreator={true} creatorId={profile?.id} />
      </div>
    </div>
  );
};

export default CreatorSettings;
