import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Euro, DollarSign, PoundSterling, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionPricingProps {
  creatorId: string;
}

const SubscriptionPricing: React.FC<SubscriptionPricingProps> = ({ creatorId }) => {
  const [price, setPrice] = useState<string>('9.99');
  const [currency, setCurrency] = useState<string>('EUR');
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [hasStripeProduct, setHasStripeProduct] = useState(false);

  useEffect(() => {
    loadCurrentPricing();
  }, [creatorId]);

  const loadCurrentPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('subscription_price, currency, stripe_product_id, stripe_price_id')
        .eq('id', creatorId)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentPrice(data.subscription_price);
        setCurrency(data.currency || 'EUR');
        setPrice(data.subscription_price?.toString() || '9.99');
        setHasStripeProduct(!!(data.stripe_product_id && data.stripe_price_id));
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    }
  };

  const handleUpdatePrice = async () => {
    if (price === '' || parseFloat(price) < 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }

    const priceValue = parseFloat(price);
    
    // Prix gratuit (0) ou minimum 2.99€
    if (priceValue !== 0 && priceValue < 2.99) {
      toast.error('Le prix minimum est de 2,99 € (ou gratuit à 0 €)');
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour le prix dans la base de données locale
      const { error: updateError } = await supabase
        .from('creators')
        .update({
          subscription_price: priceValue,
          currency: currency
        })
        .eq('id', creatorId);

      if (updateError) throw updateError;

      setCurrentPrice(priceValue);
      toast.success('Prix d\'abonnement mis à jour avec succès !');
      
      if (!hasStripeProduct) {
        toast.info('Note : Vous devrez configurer Stripe Connect pour accepter les paiements dans l\'onglet Paiements.');
      }
      
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast.error('Erreur lors de la mise à jour du prix : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyIcon = () => {
    switch (currency) {
      case 'EUR':
        return <Euro className="h-4 w-4" />;
      case 'USD':
        return <DollarSign className="h-4 w-4" />;
      case 'GBP':
        return <PoundSterling className="h-4 w-4" />;
      default:
        return <Euro className="h-4 w-4" />;
    }
  };

  const getSymbol = () => {
    switch (currency) {
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'GBP':
        return '£';
      default:
        return '€';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getCurrencyIcon()}
          Prix d'abonnement
        </CardTitle>
        <CardDescription>
          Définissez le prix mensuel de votre abonnement. Vos abonnés paieront ce montant chaque mois pour accéder à votre contenu premium.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {currentPrice !== null && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prix actuel</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: currency 
                  }).format(currentPrice)}
                  <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
              </div>
              {hasStripeProduct && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Stripe configuré
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    EUR - Euro
                  </div>
                </SelectItem>
                <SelectItem value="USD">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    USD - Dollar
                  </div>
                </SelectItem>
                <SelectItem value="GBP">
                  <div className="flex items-center gap-2">
                    <PoundSterling className="h-4 w-4" />
                    GBP - Livre sterling
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix mensuel</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getSymbol()}
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 pour gratuit, ou min 2.99"
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mettez 0 pour un abonnement gratuit
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Ce que vous recevrez :</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• Commission plateforme : 15% du montant total</p>
            <p>• Votre revenu : {price ? (parseFloat(price) * 0.85).toFixed(2) : '0.00'} {getSymbol()}/mois par abonné</p>
          </div>
        </div>

        <Button 
          onClick={handleUpdatePrice}
          disabled={loading}
          size="sm"
          variant="premium"
        >
          {loading ? 'Mise à jour...' : 'Enregistrer'}
        </Button>

        {!hasStripeProduct && currentPrice !== null && currentPrice > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm text-orange-600">
              ⚠️ <strong>Important :</strong> Vous devez configurer Stripe Connect dans l'onglet "Paiements" pour commencer à accepter les paiements d'abonnement.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionPricing;
