import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Users, Image, TrendingUp, Lock } from 'lucide-react';
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
    navigate(`/creator/${creator.user_id}`);
  };

  if (compact) {
    return (
      <div
        onClick={handleViewProfile}
        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={creator.avatar_url || ''} />
          <AvatarFallback>{creatorInitials}</AvatarFallback>
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
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {creator.category && <span>{creator.category}</span>}
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={creator.avatar_url || ''} />
            <AvatarFallback className="text-xl">{creatorInitials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold truncate">{creatorName}</h3>
              {creator.is_verified && (
                <Crown className="h-4 w-4 text-primary" />
              )}
              {creator.is_featured && (
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  En vedette
                </Badge>
              )}
            </div>
            
            {creator.bio && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {creator.bio}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
              {creator.category && (
                <Badge variant="outline" className="text-xs">
                  {creator.category}
                </Badge>
              )}
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{creator.total_subscribers} abonnés</span>
              </div>
              <div className="flex items-center space-x-1">
                <Image className="h-4 w-4" />
                <span>{creator.total_content} contenus</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                {creator.subscription_price > 0 ? (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatPrice(creator.subscription_price)}/mois
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Gratuit
                  </Badge>
                )}
              </div>
              
              <Button onClick={handleViewProfile} variant="outline">
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