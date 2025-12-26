import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, User, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import AccountDeletion from '@/components/settings/AccountDeletion';
import CreatorAccountPause from '@/components/creator/CreatorAccountPause';

interface CreatorProfile {
  id: string;
  stage_name: string | null;
  category: string | null;
  is_accepting_tips: boolean;
}

const CreatorSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  
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
      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

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
          className="w-full"
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
