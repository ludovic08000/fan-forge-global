import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Clock, TrendingUp, Zap, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const BOOST_OPTIONS = [
  {
    id: '30min',
    name: '30 minutes',
    price: 3,
    duration: '30 min',
    icon: Zap,
    description: 'Boost express pour une visibilité immédiate',
    color: 'text-orange-500'
  },
  {
    id: '24h',
    name: '24 heures', 
    price: 10,
    duration: '24h',
    icon: Clock,
    description: 'Visibilité maximale pendant une journée complète',
    color: 'text-blue-500',
    popular: true
  },
  {
    id: '1week',
    name: '1 semaine',
    price: 25,
    duration: '7 jours',
    icon: TrendingUp,
    description: 'Boost premium pour une semaine de visibilité',
    color: 'text-purple-500'
  }
];

interface CreatorBoostProps {
  currentBoostUntil?: string | null;
  onBoostUpdate?: () => void;
}

const CreatorBoost: React.FC<CreatorBoostProps> = ({ currentBoostUntil, onBoostUpdate }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();

  const isCurrentlyBoosted = currentBoostUntil && new Date(currentBoostUntil) > new Date();

  const handleBoostPurchase = async (boostType: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour acheter un boost');
      return;
    }

    setLoading(boostType);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-creator-boost', {
        body: { boost_type: boostType }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        toast.success(`Redirection vers le paiement pour le boost ${data.boost_info?.name}`);
      }
    } catch (error: any) {
      console.error('Error creating boost checkout:', error);
      toast.error(error.message || 'Erreur lors de la création du checkout');
    } finally {
      setLoading(null);
    }
  };

  const formatBoostEndTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-primary" />
          <CardTitle>Boost de Visibilité</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Augmentez votre visibilité et apparaissez en tête des résultats de recherche
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCurrentlyBoosted && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Boost Actif</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre profil est boosté jusqu'au {formatBoostEndTime(currentBoostUntil)}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium">Choisissez votre boost :</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BOOST_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`relative p-4 border rounded-lg transition-all hover:shadow-md ${
                    option.popular ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {option.popular && (
                    <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                      Populaire
                    </Badge>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-5 w-5 ${option.color}`} />
                      <span className="font-medium">{option.name}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">{option.price}€</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    
                    <Button
                      onClick={() => handleBoostPurchase(option.id)}
                      disabled={loading === option.id || isCurrentlyBoosted}
                      className="w-full"
                      variant={option.popular ? "default" : "outline"}
                    >
                      {loading === option.id ? (
                        "Redirection..."
                      ) : isCurrentlyBoosted ? (
                        "Déjà boosté"
                      ) : (
                        `Boost ${option.duration}`
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />
        
        <div className="space-y-2">
          <h5 className="font-medium text-sm">Avantages du boost :</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Apparition en tête des résultats de recherche</li>
            <li>• Badge "En vedette" sur votre profil</li> 
            <li>• Visibilité maximale auprès des nouveaux abonnés</li>
            <li>• Augmentation du trafic sur votre profil</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatorBoost;