import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Save, User, Gift, Camera, Loader2, ImageIcon, FileText, Instagram, Youtube, Link2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AccountDeletion from '@/components/settings/AccountDeletion';
import CreatorAccountPause from '@/components/creator/CreatorAccountPause';
import ProfilePreviewDialog from '@/components/creator/ProfilePreviewDialog';
import CoverPositionEditor from '@/components/creator/CoverPositionEditor';

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
  cover_position: number | null;
  bio: string | null;
  is_verified: boolean | null;
  instagram_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
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
    isAcceptingTips: true,
    bio: '',
    instagram_url: '',
    twitter_url: '',
    tiktok_url: '',
    youtube_url: ''
  });
  const [savingBio, setSavingBio] = useState(false);
  const [savingSocials, setSavingSocials] = useState(false);
  
  const MAX_BIO_LENGTH = 500;

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
          setFormData(prev => ({
            ...prev,
            stageName: data.stage_name || '',
            category: data.category || '',
            isAcceptingTips: data.is_accepting_tips
          }));
        }

        // Load user profile for avatar/cover/bio
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url, cover_url, cover_position, bio, is_verified, instagram_url, twitter_url, tiktok_url, youtube_url')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
          setFormData(prev => ({ 
            ...prev, 
            bio: profileData.bio || '',
            instagram_url: profileData.instagram_url || '',
            twitter_url: profileData.twitter_url || '',
            tiktok_url: profileData.tiktok_url || '',
            youtube_url: profileData.youtube_url || ''
          }));
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
              coverPosition={userProfile?.cover_position ?? 50}
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
            <div className="flex items-center justify-between">
              <Label>Photo de couverture</Label>
              {userProfile?.cover_url && (
                <CoverPositionEditor
                  coverUrl={userProfile.cover_url}
                  initialPosition={userProfile.cover_position ?? 50}
                  onSave={async (position) => {
                    if (!user) return;
                    const { error } = await supabase
                      .from('profiles')
                      .update({ cover_position: position })
                      .eq('user_id', user.id);
                    
                    if (error) {
                      toast.error('Erreur lors de la sauvegarde');
                      throw error;
                    }
                    
                    setUserProfile(prev => prev ? { ...prev, cover_position: position } : null);
                    toast.success('Position de couverture mise à jour');
                  }}
                />
              )}
            </div>
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden group">
              {userProfile?.cover_url ? (
                <img 
                  src={userProfile.cover_url} 
                  alt="Couverture" 
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `center ${userProfile.cover_position ?? 50}%` }}
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

      {/* Section Biographie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Biographie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Présentez-vous à vos fans</Label>
            <Textarea
              id="bio"
              placeholder="Parlez de vous, de votre contenu, de ce qui vous rend unique... Attirez de nouveaux abonnés avec une description captivante !"
              value={formData.bio}
              onChange={(e) => {
                if (e.target.value.length <= MAX_BIO_LENGTH) {
                  setFormData(prev => ({ ...prev, bio: e.target.value }));
                }
              }}
              className="min-h-[120px] resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Une bonne bio augmente vos chances d'attirer de nouveaux abonnés
              </p>
              <span className={`text-xs ${formData.bio.length >= MAX_BIO_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formData.bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={savingBio}
            onClick={async () => {
              if (!user) return;
              setSavingBio(true);
              try {
                const { error } = await supabase
                  .from('profiles')
                  .update({ bio: formData.bio || null })
                  .eq('user_id', user.id);
                
                if (error) throw error;
                setUserProfile(prev => prev ? { ...prev, bio: formData.bio } : null);
                toast.success('Biographie mise à jour');
              } catch (error) {
                console.error('Error saving bio:', error);
                toast.error('Erreur lors de la sauvegarde');
              } finally {
                setSavingBio(false);
              }
            }}
          >
            {savingBio ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer la bio
          </Button>
        </CardContent>
      </Card>

      {/* Section Réseaux Sociaux */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Réseaux sociaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-4">
            Ajoutez vos liens pour que vos fans puissent vous suivre sur d'autres plateformes
          </p>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram
              </Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/votre_pseudo"
                value={formData.instagram_url}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
              </Label>
              <Input
                id="twitter"
                placeholder="https://x.com/votre_pseudo"
                value={formData.twitter_url}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter_url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok" className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </Label>
              <Input
                id="tiktok"
                placeholder="https://tiktok.com/@votre_pseudo"
                value={formData.tiktok_url}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktok_url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube
              </Label>
              <Input
                id="youtube"
                placeholder="https://youtube.com/@votre_chaine"
                value={formData.youtube_url}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={savingSocials}
            onClick={async () => {
              if (!user) return;
              setSavingSocials(true);
              try {
                const { error } = await supabase
                  .from('profiles')
                  .update({ 
                    instagram_url: formData.instagram_url || null,
                    twitter_url: formData.twitter_url || null,
                    tiktok_url: formData.tiktok_url || null,
                    youtube_url: formData.youtube_url || null
                  })
                  .eq('user_id', user.id);
                
                if (error) throw error;
                setUserProfile(prev => prev ? { 
                  ...prev, 
                  instagram_url: formData.instagram_url || null,
                  twitter_url: formData.twitter_url || null,
                  tiktok_url: formData.tiktok_url || null,
                  youtube_url: formData.youtube_url || null
                } : null);
                toast.success('Réseaux sociaux mis à jour');
              } catch (error) {
                console.error('Error saving socials:', error);
                toast.error('Erreur lors de la sauvegarde');
              } finally {
                setSavingSocials(false);
              }
            }}
          >
            {savingSocials ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer les liens
          </Button>
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
