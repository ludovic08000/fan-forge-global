import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Image, Sparkles, Crown, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SearchCreator } from '@/hooks/useSearch';

interface PopularCreatorCardProps {
  creator: SearchCreator;
  index?: number;
}

const PopularCreatorCard: React.FC<PopularCreatorCardProps> = ({ creator, index = 0 }) => {
  const creatorName = creator.stage_name || creator.display_name || creator.username || 'Créateur';
  const creatorInitials = creatorName.charAt(0).toUpperCase();

  const profilePath = creator.username 
    ? `/${creator.username}` 
    : `/creator/${creator.user_id}`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: creator.currency?.toUpperCase() || 'EUR'
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.08, 
        duration: 0.5, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
    >
      <Link 
        to={profilePath}
        className="group relative block overflow-hidden rounded-2xl bg-gradient-to-b from-card to-card/80 border border-border/40 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.3)] hover:-translate-y-2"
      >
        {/* Background glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-accent/5 transition-all duration-700" />
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 delay-200" />
        </div>

        {/* Cover gradient with pattern */}
        <div className="relative h-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-accent/20" />
          
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-accent/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
          
          {/* Featured badge */}
          {creator.is_featured && (
            <motion.div 
              className="absolute top-3 right-3 z-10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.08 + 0.3, type: "spring" }}
            >
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 border-0 gap-1 px-2.5 py-1">
                <Sparkles className="h-3 w-3" />
                Boost
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Avatar container */}
        <div className="relative px-5 -mt-12 z-10">
          <div className="relative inline-block">
            {/* Avatar glow */}
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-2xl group-hover:ring-primary/30 transition-all duration-500 group-hover:scale-105">
              <AvatarImage src={creator.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary via-primary to-primary-foreground/90 text-primary-foreground">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            
            {/* Verified badge */}
            {creator.is_verified && (
              <motion.div 
                className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg ring-2 ring-background"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.08 + 0.4, type: "spring" }}
              >
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative p-5 pt-4">
          {/* Name */}
          <h3 className="text-lg font-bold truncate mb-1 group-hover:text-primary transition-colors duration-300">
            {creatorName}
          </h3>
          
          {/* Category */}
          {creator.category && (
            <p className="text-sm text-muted-foreground mb-3 truncate">
              {creator.category}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold">{creator.total_subscribers}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <Image className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold">{creator.total_content}</span>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            {creator.subscription_price > 0 ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-foreground/80 bg-clip-text text-transparent">
                  {formatPrice(creator.subscription_price)}
                </span>
                <span className="text-xs text-muted-foreground">/mois</span>
              </div>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 font-semibold">
                Gratuit
              </Badge>
            )}
            
            <motion.div 
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Crown className="h-4 w-4" />
              Voir
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default PopularCreatorCard;
