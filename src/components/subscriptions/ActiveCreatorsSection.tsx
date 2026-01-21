import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, FileText, Crown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Créateurs populaires
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </h2>
            <p className="text-sm text-muted-foreground">Découvrez les plus suivis</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="group">
          <Link to="/search" className="flex items-center gap-2">
            Tout voir
            <TrendingUp className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : creators && creators.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {creators.map((creator, index) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <CreatorCard creator={creator} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Aucun créateur pour le moment</p>
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
    <Link to={linkPath} className="group block">
      <Card className="overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:border-primary/40 h-full bg-gradient-to-b from-card to-card/80 hover:-translate-y-1">
        <CardContent className="p-5 flex flex-col items-center text-center">
          {/* Avatar with glow effect */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300 shadow-lg">
              <AvatarImage src={creator.profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name */}
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors mb-2">
            {displayName}
          </h3>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
              <FileText className="h-3 w-3" />
              <span className="font-medium">{creator.total_content || 0}</span>
            </span>
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
              <Users className="h-3 w-3" />
              <span className="font-medium">{creator.total_subscribers || 0}</span>
            </span>
          </div>
          
          {/* Price badge */}
          <Badge 
            variant={creator.subscription_price > 0 ? "default" : "secondary"} 
            className={`text-xs font-semibold ${creator.subscription_price > 0 ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
          >
            {creator.subscription_price > 0 ? `${creator.subscription_price}€/mois` : 'Gratuit'}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
};
