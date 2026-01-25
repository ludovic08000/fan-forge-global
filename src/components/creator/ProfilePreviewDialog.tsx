import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, Crown, MessageCircle, CheckCircle2, Heart, Image, Users, Grid3X3, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfilePreviewDialogProps {
  stageName: string;
  category: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverPositionX?: number;
  coverPositionY?: number;
  subscriptionPrice?: number;
  currency?: string;
  isVerified?: boolean;
  bio?: string;
  totalSubscribers?: number;
  totalContent?: number;
}

const ProfilePreviewDialog: React.FC<ProfilePreviewDialogProps> = ({
  stageName,
  category,
  avatarUrl,
  coverUrl,
  coverPositionX = 50,
  coverPositionY = 50,
  subscriptionPrice = 0,
  currency = 'EUR',
  isVerified = false,
  bio = '',
  totalSubscribers = 0,
  totalContent = 0,
}) => {
  const displayName = stageName || 'Votre nom de scène';
  
  const formatPrice = (price: number) => {
    if (price <= 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(price);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Prévisualiser mon profil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Aperçu de votre profil public</DialogTitle>
        </DialogHeader>
        
        {/* Preview Container - simule le rendu mobile */}
        <div className="bg-background">
          {/* Cover Photo Preview */}
          <div className="relative h-40 bg-gradient-to-br from-primary/30 to-primary/10">
            {coverUrl ? (
              <motion.img 
                src={coverUrl} 
                alt="Couverture" 
                className="w-full h-full object-cover"
                style={{ objectPosition: `${coverPositionX}% ${coverPositionY}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground/50">
                  <Image className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs">Photo de couverture</p>
                </div>
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            
            {/* Navigation preview (disabled) */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="p-2 rounded-full bg-black/40">
                <div className="h-4 w-4 bg-white/50 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="p-2 rounded-full bg-black/40">
                  <div className="h-4 w-4 bg-white/50 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="relative px-4 pb-4 -mt-12">
            {/* Avatar */}
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                <AvatarImage src={avatarUrl || ''} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 shadow ring-2 ring-background">
                  <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Name & Category */}
            <div className="mt-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {displayName}
              </h2>
              {category && (
                <p className="text-sm text-muted-foreground mt-0.5">{category}</p>
              )}
            </div>

            {/* Bio preview */}
            {bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex gap-4 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold">{totalContent}</p>
                <p className="text-xs text-muted-foreground">Publications</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{totalSubscribers}</p>
                <p className="text-xs text-muted-foreground">Abonnés</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">0</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
            </div>

            {/* Action Buttons Preview */}
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/90" disabled>
                <Crown className="h-4 w-4" />
                {subscriptionPrice > 0 ? formatPrice(subscriptionPrice) + '/mois' : 'S\'abonner gratuitement'}
              </Button>
              <Button variant="outline" size="icon" disabled>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs preview */}
            <div className="flex border-b mt-4">
              <div className="flex-1 py-2.5 text-center border-b-2 border-primary text-sm font-medium">
                <Grid3X3 className="h-4 w-4 mx-auto" />
              </div>
              <div className="flex-1 py-2.5 text-center text-muted-foreground text-sm">
                <Play className="h-4 w-4 mx-auto" />
              </div>
            </div>

            {/* Content Grid Preview */}
            <div className="grid grid-cols-3 gap-0.5 mt-2">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-muted/50 flex items-center justify-center"
                >
                  <Image className="h-6 w-6 text-muted-foreground/30" />
                </div>
              ))}
            </div>
          </div>

          {/* Info Banner */}
          <div className="mx-4 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-center text-muted-foreground">
              <Eye className="h-3 w-3 inline mr-1" />
              C'est l'aperçu que les utilisateurs verront en visitant votre profil
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePreviewDialog;
