import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Users, Image, TrendingUp, Lock, CheckCircle2 } from 'lucide-react';
import { SearchCreator } from '@/hooks/useSearch';

interface CreatorSearchCardProps {
  creator: SearchCreator;
  compact?: boolean;
}

const CreatorSearchCard: React.FC<CreatorSearchCardProps> = ({ creator, compact = false }) => {
  const creatorName = creator.stage_name || creator.display_name || creator.username || 'Créateur';
  const creatorInitials = creatorName.charAt(0).toUpperCase();

  // Construire le chemin vers le profil
  const profilePath = creator.username 
    ? `/${creator.username}` 
    : `/creator/${creator.user_id}`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: creator.currency.toUpperCase()
    }).format(price);
  };

  if (compact) {
    return (
      <Link
        to={profilePath}
        className="flex items-center gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-card/80 cursor-pointer transition-all duration-300 group block"
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/50 transition-all">
            <AvatarImage src={creator.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary-glow/20 font-semibold text-lg">
              {creatorInitials}
            </AvatarFallback>
          </Avatar>
          {creator.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-0.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{creatorName}</h3>
            {creator.is_featured && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-primary to-primary-glow">
                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                Boost
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {creator.total_subscribers}
            </span>
            <span className="flex items-center gap-1">
              <Image className="h-3.5 w-3.5" />
              {creator.total_content}
            </span>
            {creator.category && (
              <span className="text-xs truncate">{creator.category}</span>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0">
          {creator.subscription_price > 0 ? (
            <div className="text-right">
              <span className="font-bold text-primary">{formatPrice(creator.subscription_price)}</span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
          ) : (
            <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
              Gratuit
            </Badge>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={profilePath}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all duration-500 cursor-pointer hover:shadow-[var(--shadow-premium)] block"
    >
      {/* Cover/Background gradient */}
      <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 relative overflow-hidden">
        {creator.is_featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg gap-1 px-2.5">
              <TrendingUp className="h-3 w-3" />
              En vedette
            </Badge>
          </div>
        )}
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Avatar - positioned over the cover */}
      <div className="relative px-5 -mt-10">
        <div className="relative inline-block">
          <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl group-hover:scale-105 transition-transform duration-300">
            <AvatarImage src={creator.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              {creatorInitials}
            </AvatarFallback>
          </Avatar>
          {creator.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 shadow-lg ring-2 ring-background">
              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pt-3">
        <div className="mb-3">
          <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
            {creatorName}
          </h3>
          {creator.username && (
            <p className="text-sm text-muted-foreground">@{creator.username}</p>
          )}
        </div>

        {creator.bio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {creator.bio}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {creator.category && (
            <Badge variant="secondary" className="text-xs bg-secondary/50">
              {creator.category}
            </Badge>
          )}
          {creator.content_type && creator.content_type.slice(0, 2).map((type, i) => (
            <Badge key={i} variant="outline" className="text-xs border-border/50">
              {type}
            </Badge>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{creator.total_subscribers}</span>
            <span className="text-xs">abonnés</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Image className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{creator.total_content}</span>
            <span className="text-xs">contenus</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {creator.subscription_price > 0 ? (
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg text-primary">
                {formatPrice(creator.subscription_price)}
              </span>
              <span className="text-sm text-muted-foreground">/mois</span>
            </div>
          ) : (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
              Gratuit
            </Badge>
          )}
          
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow-md group-hover:shadow-lg transition-all">
            <Crown className="h-4 w-4" />
            Voir
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CreatorSearchCard;