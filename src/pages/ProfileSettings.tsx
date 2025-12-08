import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Upload, Trash2, User, Calendar, MapPin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import AccountDeletion from "@/components/settings/AccountDeletion";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
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
      
      toast.success("Profil mis à jour avec succès");
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

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
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

      // Upload to user-photos bucket
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL since bucket is private
      const { data: signedUrl } = await supabase.storage
        .from("user-photos")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      // Save to user_photos table
      const { error: dbError } = await supabase
        .from("user_photos")
        .insert({
          user_id: user.id,
          photo_url: signedUrl?.signedUrl || fileName,
        });

      if (dbError) throw dbError;

      toast.success("Photo ajoutée avec succès");
      loadPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!user) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from("user_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      toast.success("Photo supprimée");
      loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Calculate age from birthdate
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
  const isAdult = age !== null && age >= 18;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Paramètres du profil</h1>
            <p className="text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo de profil
            </CardTitle>
            <CardDescription>
              Cette photo sera visible par tous les utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" disabled={uploadingAvatar} asChild>
                  <span>
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Changer la photo
                  </span>
                </Button>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Max 5 Mo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Ces informations aident à personnaliser votre expérience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                {age !== null && (
                  <p className={`text-sm ${isAdult ? "text-green-600" : "text-amber-600"}`}>
                    {age} ans {isAdult ? "(majeur)" : "(mineur - accès limité au contenu adulte)"}
                  </p>
                )}
              </div>

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
                <Label htmlFor="orientation">Orientation sexuelle</Label>
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

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>

        {/* Location Photos Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Photos de lieux
            </CardTitle>
            <CardDescription>
              Partagez des photos de vos endroits préférés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button variant="outline" disabled={uploadingPhoto} asChild>
                  <span>
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Ajouter une photo
                  </span>
                </Button>
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Max 10 Mo.
              </p>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <img
                      src={photo.photo_url}
                      alt="Photo de lieu"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune photo pour le moment
              </p>
            )}
          </CardContent>
        </Card>

        {/* Age Verification Notice */}
        {age !== null && !isAdult && (
          <Card className="border-amber-500 bg-amber-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-600">Accès limité</h3>
                  <p className="text-sm text-muted-foreground">
                    En tant que mineur, vous n'avez pas accès aux sections réservées aux adultes 
                    (charme, érotique). Cette restriction est automatique et basée sur votre date de naissance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suppression de compte */}
        <AccountDeletion />
      </div>
    </div>
  );
};

export default ProfileSettings;
