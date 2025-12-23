import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Users, Image, TrendingUp, Lock, Heart, User, Camera } from 'lucide-react';
import { SearchCreator } from '@/hooks/useSearch';

interface CreatorSearchCardProps {
  creator: SearchCreator;
  compact?: boolean;
}

const CreatorSearchCard: React.FC<CreatorSearchCardProps> = ({ creator, compact = false }) => {
  const navigate = useNavigate();
  
  const creatorName = creator.stage_name || creator.display_name || creator.username || 'Créateur';
  const creatorInitials = creatorName.charAt(0).toUpperCase();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: creator.currency.toUpperCase()
    }).format(price);
  };

  const handleViewProfile = () => {
    if (creator.username) {
      navigate(`/${creator.username}`);
    } else {
      navigate(`/creator/${creator.user_id}`);
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleViewProfile}
        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
      >
        <Avatar className="h-14 w-14 ring-2 ring-primary/10 flex-shrink-0 shadow-md">
          <AvatarImage src={creator.avatar_url || ''} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary-glow/20 font-semibold">{creatorInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium truncate">{creatorName}</h3>
            {creator.is_verified && (
              <Crown className="h-4 w-4 text-primary" />
            )}
            {creator.is_featured && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Boost
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {creator.category && <span>{creator.category}</span>}
            {creator.gender && (
              <>
                <span>•</span>
                <span>{creator.gender}</span>
              </>
            )}
            {creator.orientation && (
              <>
                <span>•</span>
                <span>{creator.orientation}</span>
              </>
            )}
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{creator.total_subscribers}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Image className="h-3 w-3" />
              <span>{creator.total_content}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {creator.subscription_price > 0 ? (
            <div className="text-sm font-medium">
              {formatPrice(creator.subscription_price)}/mois
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">Gratuit</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="group hover:shadow-[var(--shadow-card)] hover:border-primary/30 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20 group-hover:ring-primary/50 group-hover:ring-4 transition-all duration-300 shadow-lg">
              <AvatarImage src={creator.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/30 to-primary-glow/30 text-primary">{creatorInitials}</AvatarFallback>
            </Avatar>
            {creator.is_featured && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary-glow rounded-full p-1.5 shadow-md animate-pulse">
                <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{creatorName}</h3>
              {creator.is_verified && (
                <Crown className="h-4 w-4 text-primary animate-pulse" />
              )}
            </div>
            
            {creator.bio && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                {creator.bio}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
              {creator.category && (
                <Badge variant="outline" className="text-xs border-primary/30 hover:bg-primary/10">
                  {creator.category}
                </Badge>
              )}
              {creator.gender && (
                <Badge variant="secondary" className="text-xs bg-card hover:bg-muted">
                  <User className="h-3 w-3 mr-1" />
                  {creator.gender}
                </Badge>
              )}
              {creator.orientation && (
                <Badge variant="secondary" className="text-xs bg-card hover:bg-muted">
                  <Heart className="h-3 w-3 mr-1" />
                  {creator.orientation}
                </Badge>
              )}
              {creator.content_type && creator.content_type.length > 0 && (
                <Badge variant="outline" className="text-xs border-primary/30 hover:bg-primary/10">
                  <Camera className="h-3 w-3 mr-1" />
                  {creator.content_type.join(', ')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center space-x-1 group/stat hover:text-primary transition-colors">
                <Users className="h-4 w-4" />
                <span className="font-medium">{creator.total_subscribers}</span>
                <span className="text-xs">abonnés</span>
              </div>
              <div className="flex items-center space-x-1 group/stat hover:text-primary transition-colors">
                <Image className="h-4 w-4" />
                <span className="font-medium">{creator.total_content}</span>
                <span className="text-xs">contenus</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                {creator.subscription_price > 0 ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-bold text-primary">
                      {formatPrice(creator.subscription_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">/mois</span>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 font-semibold">
                    Gratuit
                  </Badge>
                )}
              </div>
              
              <Button 
                onClick={handleViewProfile} 
                variant="outline"
                className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
              >
                Voir le profil
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatorSearchCard;