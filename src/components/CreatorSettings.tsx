import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Euro, Save, Settings, Crown, Gift, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { creatorProfileSchema } from '@/lib/validations';
import { z } from 'zod';

interface CreatorProfile {
  id: string;
  stage_name: string | null;
  category: string | null;
  subscription_price: number;
  currency: string;
  is_accepting_tips: boolean;
  bank_account_holder: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_country: string | null;
  tax_id: string | null;
}

const CreatorSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  
  const [formData, setFormData] = useState({
    stageName: '',
    category: '',
    subscriptionPrice: 0,
    currency: 'EUR',
    isAcceptingTips: true,
    bankAccountHolder: '',
    bankIban: '',
    bankBic: '',
    bankCountry: 'FR',
    taxId: ''
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
    'Autre'
  ];

  // Charger le profil créateur
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
            subscriptionPrice: data.subscription_price || 0,
            currency: data.currency || 'EUR',
            isAcceptingTips: data.is_accepting_tips,
            bankAccountHolder: data.bank_account_holder || '',
            bankIban: data.bank_iban || '',
            bankBic: data.bank_bic || '',
            bankCountry: data.bank_country || 'FR',
            taxId: data.tax_id || ''
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
      // Valider avec Zod
      const validatedData = creatorProfileSchema.parse({
        stageName: formData.stageName,
        category: formData.category,
        subscriptionPrice: formData.subscriptionPrice,
        currency: formData.currency,
      });

      const updateData = {
        stage_name: validatedData.stageName || null,
        category: validatedData.category || null,
        subscription_price: validatedData.subscriptionPrice,
        currency: validatedData.currency,
        is_accepting_tips: formData.isAcceptingTips,
        bank_account_holder: formData.bankAccountHolder || null,
        bank_iban: formData.bankIban || null,
        bank_bic: formData.bankBic || null,
        bank_country: formData.bankCountry || null,
        tax_id: formData.taxId || null
      };

      // Détecter les changements d'IBAN/BIC
      const ibanChanged = profile && profile.bank_iban !== formData.bankIban;
      const bicChanged = profile && profile.bank_bic !== formData.bankBic;

      if (profile) {
        // Mise à jour
        const { error } = await supabase
          .from('creators')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) throw error;

        // Envoyer notification si IBAN/BIC modifié
        if (ibanChanged || bicChanged) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('notify-iban-change', {
              body: {
                oldIban: profile.bank_iban,
                newIban: formData.bankIban,
                oldBic: profile.bank_bic,
                newBic: formData.bankBic,
              }
            });
            toast.success('Paramètres mis à jour - Notification de sécurité envoyée');
          }
        } else {
          toast.success('Paramètres mis à jour avec succès');
        }
      } else {
        // Création
        const { error } = await supabase
          .from('creators')
          .insert({
            user_id: user.id,
            ...updateData
          });

        if (error) throw error;
        toast.success('Profil créateur créé avec succès');
        
        // Recharger le profil
        const { data } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) setProfile(data);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          toast.error(err.message);
        });
      } else {
        console.error('Error saving profile:', error);
        toast.error('Erreur lors de la sauvegarde');
      }
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
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Paramètres Créateur</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nom de scène</Label>
              <Input
                id="stageName"
                placeholder="Votre nom d'artiste ou de marque"
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
                  <SelectValue placeholder="Sélectionnez votre catégorie" />
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
          </CardContent>
        </Card>

        {/* Configuration des prix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-primary" />
              <span>Configuration des prix</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prix d'abonnement */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subscriptionPrice">Prix d'abonnement mensuel</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Définissez le prix que vos fans paieront pour accéder à votre contenu premium
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="subscriptionPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="9.99"
                    value={formData.subscriptionPrice}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      subscriptionPrice: parseFloat(e.target.value) || 0 
                    }))}
                    className="pl-10"
                  />
                </div>
                
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Crown className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Conseils de tarification :</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• Commencez avec un prix accessible (5-15€/mois)</li>
                      <li>• Augmentez progressivement selon votre popularité</li>
                      <li>• Prix de 0€ = abonnement gratuit</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pourboires */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <Label htmlFor="acceptTips">Accepter les pourboires</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permettre à vos fans de vous envoyer des pourboires
                  </p>
                </div>
                <Switch
                  id="acceptTips"
                  checked={formData.isAcceptingTips}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAcceptingTips: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations bancaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Informations bancaires</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">
                Ces informations sont nécessaires pour recevoir vos paiements. 
                Elles sont sécurisées et ne seront jamais partagées publiquement.
              </p>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
              <p className="text-sm font-medium text-primary">
                🔒 Sécurité : Toute modification d'IBAN ou de BIC générera une notification pour protéger votre compte.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountHolder">Titulaire du compte</Label>
              <Input
                id="bankAccountHolder"
                placeholder="Nom complet du titulaire"
                value={formData.bankAccountHolder}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAccountHolder: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankIban">IBAN</Label>
              <Input
                id="bankIban"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={formData.bankIban}
                onChange={(e) => setFormData(prev => ({ ...prev, bankIban: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankBic">BIC/SWIFT</Label>
              <Input
                id="bankBic"
                placeholder="BNPAFRPPXXX"
                value={formData.bankBic}
                onChange={(e) => setFormData(prev => ({ ...prev, bankBic: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankCountry">Pays</Label>
              <Select
                value={formData.bankCountry}
                onValueChange={(value) => setFormData(prev => ({ ...prev, bankCountry: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="BE">Belgique</SelectItem>
                  <SelectItem value="CH">Suisse</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="LU">Luxembourg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Numéro SIRET / TVA (optionnel)</Label>
              <Input
                id="taxId"
                placeholder="12345678901234"
                value={formData.taxId}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Aperçu */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu pour vos fans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-card">
              <div className="text-center space-y-3">
                <h3 className="font-semibold">
                  {formData.stageName || 'Votre nom de scène'}
                </h3>
                {formData.category && (
                  <p className="text-sm text-muted-foreground">{formData.category}</p>
                )}
                
                {formData.subscriptionPrice > 0 ? (
                  <div className="space-y-2">
                    <p className="text-lg font-bold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: formData.currency
                      }).format(formData.subscriptionPrice)}/mois
                    </p>
                    <Button variant="premium" size="sm">
                      S'abonner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Abonnement gratuit</p>
                    <Button variant="outline" size="sm">
                      Suivre gratuitement
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton de sauvegarde */}
        <Button 
          type="submit" 
          disabled={saving}
          className="w-full"
          variant="premium"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
        </Button>
      </form>
    </div>
  );
};

export default CreatorSettings;