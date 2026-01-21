import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, FileText } from 'lucide-react';

interface Creator {
  id: string;
  stage_name: string | null;
  subscription_price: number;
  total_content: number | null;
  total_subscribers: number | null;
  user_id: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ActiveCreatorsSectionProps {
  creators: Creator[] | undefined;
  isLoading: boolean;
}

export const ActiveCreatorsSection = ({ creators, isLoading }: ActiveCreatorsSectionProps) => {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Créateurs populaires</h2>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/search">Tout voir</Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : creators && creators.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun créateur pour le moment
          </CardContent>
        </Card>
      )}
    </section>
  );
};

const CreatorCard = ({ creator }: { creator: Creator }) => {
  const displayName = creator.stage_name || creator.profile?.display_name || creator.profile?.username || 'Créateur';
  const linkPath = creator.profile?.username 
    ? `/${creator.profile.username}` 
    : `/creator/${creator.user_id}`;

  return (
    <Link to={linkPath} className="group">
      <Card className="overflow-hidden hover:shadow-md transition-all hover:border-primary/30 h-full">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Avatar className="h-14 w-14 mb-3 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
            <AvatarImage src={creator.profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {displayName}
          </h3>
          
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <FileText className="h-3 w-3" />
              {creator.total_content || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {creator.total_subscribers || 0}
            </span>
          </div>
          
          <Badge variant="secondary" className="mt-2 text-xs">
            {creator.subscription_price > 0 ? `${creator.subscription_price}€/mois` : 'Gratuit'}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
};
