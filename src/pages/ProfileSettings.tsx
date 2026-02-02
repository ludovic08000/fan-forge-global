import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Home, Camera, Upload, Trash2, User, Calendar, Loader2, 
  MoreHorizontal, Settings, Image as ImageIcon, SlidersHorizontal,
  ChevronDown, ChevronUp, Edit3, Save, X, Shield
} from "lucide-react";
import AccountDeletion from "@/components/settings/AccountDeletion";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  birthdate: string | null;
  gender: string | null;
  orientation: string | null;
  bio: string | null;
}

interface UserPhoto {
  id: string;
  photo_url: string;
  description: string | null;
  location: string | null;
  created_at: string;
}

const ProfileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showDeletePhotoDialog, setShowDeletePhotoDialog] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  
  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [orientation, setOrientation] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
    loadPhotos();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data.display_name || "");
      setBirthdate(data.birthdate || "");
      setGender(data.gender || "");
      setOrientation(data.orientation || "");
      setBio(data.bio || "");
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          birthdate: birthdate || null,
          gender: gender || null,
          orientation: orientation || null,
          bio: bio || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast.success("Profil mis à jour");
      setEditMode(false);
      loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

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

      toast.success("Photo de profil mise à jour");
      loadProfile();
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
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Photo de couverture mise à jour");
      loadProfile();
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: signedUrl } = await supabase.storage
        .from("user-photos")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      const { error: dbError } = await supabase
        .from("user_photos")
        .insert({
          user_id: user.id,
          photo_url: signedUrl?.signedUrl || fileName,
        });

      if (dbError) throw dbError;

      toast.success("Photo ajoutée");
      loadPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      toast.success("Photo supprimée");
      setShowDeletePhotoDialog(null);
      loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const calculateAge = (birthdate: string): number | null => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = birthdate ? calculateAge(birthdate) : null;
  const userName = profile?.display_name || profile?.username || "Utilisateur";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header avec navigation */}
      <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-end p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex gap-2">
          <Link to="/security">
            <button className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
              <Shield className="h-5 w-5" />
            </button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier le profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <Settings className="h-4 w-4 mr-2" />
                Tableau de bord
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-primary/30 to-primary/10 group">
        {profile?.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover object-[center_20%]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        {/* Bouton upload cover */}
        <label className="absolute bottom-4 right-4 cursor-pointer">
          <div className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
            {uploadingCover ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverUpload}
            disabled={uploadingCover}
          />
        </label>
      </div>

      {/* Profile Section */}
      <div className="relative px-4 pb-4 -mt-16">
        {/* Avatar avec bouton upload */}
        <div className="relative inline-block">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-xl">
            <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 right-0 cursor-pointer">
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

        {/* Nom */}
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-bold">{userName}</h1>
          {age && (
            <span className="text-muted-foreground">{age} ans</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{photos.length}</span>
            <span className="text-muted-foreground">photos</span>
          </div>
        </div>

        {/* Bouton modifier */}
        <div className="mt-4">
          <Button 
            className="w-full rounded-full h-12 text-base font-semibold"
            variant="outline"
            onClick={() => setEditMode(true)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Modifier le profil
          </Button>
        </div>

        {/* Bio avec "Voir plus" */}
        {profile?.bio && (
          <div className="mt-4">
            <p className={`text-sm ${!bioExpanded ? 'line-clamp-2' : ''}`}>
              {profile.bio}
            </p>
            {profile.bio.length > 100 && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="text-muted-foreground text-sm mt-1 flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {bioExpanded ? (
                  <>Voir moins <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Voir plus <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section Photos - Grille 3 colonnes */}
      <div className="border-t border-border">
        <div className="p-4 flex items-center justify-between">
          <h2 className="font-semibold">Mes photos</h2>
          <label className="cursor-pointer">
            <Button variant="secondary" size="sm" className="rounded-full gap-2" asChild>
              <span>
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Ajouter
              </span>
            </Button>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="relative aspect-square overflow-hidden bg-muted group cursor-pointer"
                onClick={() => setShowDeletePhotoDialog(photo.id)}
              >
                <img
                  src={photo.photo_url}
                  alt="Photo"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune photo pour le moment</p>
            <p className="text-sm mt-1">Ajoutez des photos pour personnaliser votre profil</p>
          </div>
        )}
      </div>

      {/* Section Suppression de compte */}
      <div className="p-4 border-t border-border">
        <AccountDeletion />
      </div>

      {/* Dialog de modification du profil */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>
              Mettez à jour vos informations personnelles
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de naissance
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Genre</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homme">Homme</SelectItem>
                    <SelectItem value="femme">Femme</SelectItem>
                    <SelectItem value="non-binaire">Non-binaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                    <SelectItem value="ne-pas-dire">Ne pas préciser</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orientation">Orientation</Label>
                <Select value={orientation} onValueChange={setOrientation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heterosexuel">Hétérosexuel(le)</SelectItem>
                    <SelectItem value="homosexuel">Homosexuel(le)</SelectItem>
                    <SelectItem value="bisexuel">Bisexuel(le)</SelectItem>
                    <SelectItem value="pansexuel">Pansexuel(le)</SelectItem>
                    <SelectItem value="asexuel">Asexuel(le)</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                    <SelectItem value="ne-pas-dire">Ne pas préciser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Une courte description de vous..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditMode(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression de photo */}
      <Dialog open={!!showDeletePhotoDialog} onOpenChange={() => setShowDeletePhotoDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette photo ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeletePhotoDialog(null)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeletePhotoDialog && handleDeletePhoto(showDeletePhotoDialog)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettings;
