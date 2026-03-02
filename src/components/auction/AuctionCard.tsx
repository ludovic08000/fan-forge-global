/**
 * Carte d'enchère - affichée côté créateur et abonné
 * Avec countdown en temps réel et bouton d'enchère
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Clock, Users, TrendingUp, Loader2, Trophy, Euro, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Auction {
  id: string;
  title: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  min_increment: number;
  bid_count: number;
  winner_id: string | null;
  status: string;
  ends_at: string;
  paid_at: string | null;
  currency: string;
  creator_id: string;
  created_at: string;
}

interface AuctionCardProps {
  auction: Auction;
  isCreator?: boolean;
  onBidPlaced?: () => void;
  onCancel?: () => void;
}

function useCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Terminée');
        setExpired(true);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}j ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
      setExpired(false);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return { timeLeft, expired };
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  auction, isCreator = false, onBidPlaced, onCancel
}) => {
  const { user } = useAuth();
  const { timeLeft, expired } = useCountdown(auction.ends_at);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const minBid = auction.current_price + auction.min_increment;
  const isWinner = user?.id === auction.winner_id;
  const isActive = auction.status === 'active' && !expired;
  const isEnded = auction.status === 'ended' || (auction.status === 'active' && expired);
  const isPaid = auction.status === 'paid';

  useEffect(() => {
    setBidAmount(minBid.toFixed(2));
  }, [auction.current_price, auction.min_increment]);

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      toast.error(`Enchère minimum: ${minBid.toFixed(2)}€`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('place_auction_bid', {
        p_auction_id: auction.id,
        p_amount: amount,
      });
      if (error) throw error;
      toast.success(`Enchère placée: ${amount.toFixed(2)}€ ! 🔥`);
      onBidPlaced?.();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-auction-checkout', {
        body: { auctionId: auction.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de paiement');
    } finally {
      setPayLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    if (isPaid) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Payée ✓</Badge>;
    if (isEnded && isWinner) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">Vous avez gagné ! 🏆</Badge>;
    if (isEnded) return <Badge variant="secondary">Terminée</Badge>;
    if (isActive) return <Badge className="bg-primary/20 text-primary border-primary/30">En cours</Badge>;
    return <Badge variant="outline">Annulée</Badge>;
  }, [isPaid, isEnded, isActive, isWinner]);

  return (
    <Card className="overflow-hidden border-2 hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-bold text-lg truncate">{auction.title}</h3>
            </div>
            {auction.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{auction.description}</p>
            )}
          </div>
          {statusBadge}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Euro className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{auction.current_price.toFixed(2)}€</p>
            <p className="text-[10px] text-muted-foreground uppercase">Enchère actuelle</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{auction.bid_count}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Enchères</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Clock className={`h-4 w-4 mx-auto mb-1 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <p className={`text-sm font-bold ${isActive ? 'text-amber-500' : ''}`}>{timeLeft}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Restant</p>
          </div>
        </div>

        {/* Actions abonné */}
        {!isCreator && isActive && (
          <div className="flex gap-2">
            <Input
              type="number"
              min={minBid}
              step={auction.min_increment}
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              className="flex-1"
              placeholder={`Min: ${minBid.toFixed(2)}€`}
            />
            <Button onClick={handleBid} disabled={loading || isWinner} className="gap-1.5 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Enchérir
            </Button>
          </div>
        )}

        {/* Gagnant doit payer */}
        {!isCreator && isEnded && isWinner && !isPaid && (
          <Button onClick={handlePay} disabled={payLoading} className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Payer {auction.current_price.toFixed(2)}€ pour récupérer votre gain
          </Button>
        )}

        {/* Info gagnant si pas le user courant */}
        {isWinner && isActive && (
          <p className="text-sm text-emerald-500 font-medium text-center">✓ Vous êtes le meilleur enchérisseur</p>
        )}

        {/* Actions créateur */}
        {isCreator && isActive && onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 text-destructive">
            <XCircle className="h-4 w-4" />
            Annuler l'enchère
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionCard;
