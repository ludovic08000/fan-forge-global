import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Dumbbell, Gamepad2, ChefHat, Sparkles, Heart, Music, Camera, Gavel, Trophy, Dribbble, Crown, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DiscoveryFiltersProps {
  className?: string;
}

const NICHES = [
  { id: 'Glamour', label: 'Glamour', icon: Sparkles, gradient: 'from-pink-500 to-rose-500' },
  { id: 'Lifestyle', label: 'Lifestyle', icon: Heart, gradient: 'from-red-500 to-pink-500' },
  { id: 'DJing', label: 'DJ', icon: Music, gradient: 'from-violet-500 to-purple-500' },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2, gradient: 'from-emerald-500 to-green-500' },
  { id: 'Avocat', label: 'Avocat', icon: Gavel, gradient: 'from-amber-500 to-yellow-500' },
  { id: 'Football', label: 'Football', icon: Trophy, gradient: 'from-sky-500 to-blue-500' },
  { id: 'Basketball', label: 'Basketball', icon: Dribbble, gradient: 'from-orange-500 to-amber-500' },
  { id: 'Coach sportif', label: 'Coach', icon: Dumbbell, gradient: 'from-teal-500 to-cyan-500' },
  { id: 'Cuisine', label: 'Cuisine', icon: ChefHat, gradient: 'from-rose-500 to-red-500' },
  { id: 'Luxe', label: 'Luxe', icon: Crown, gradient: 'from-yellow-500 to-amber-400' },
  { id: 'Mannequin', label: 'Mannequin', icon: Camera, gradient: 'from-indigo-500 to-violet-500' },
  { id: 'Art & Création', label: 'Art', icon: Palette, gradient: 'from-fuchsia-500 to-pink-500' },
];

const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({ className }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleNicheClick = (nicheId: string) => {
    const newNiche = selectedNiche === nicheId ? null : nicheId;
    setSelectedNiche(newNiche);
    const params = new URLSearchParams();
    if (newNiche) params.set('category', newNiche);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Barre de recherche par nom */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-11 pr-10 h-12 text-base rounded-full bg-card/80 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Boutons thématiques */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
        {NICHES.map((niche, index) => {
          const Icon = niche.icon;
          const isActive = selectedNiche === niche.id;
          return (
            <motion.button
              key={niche.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              onClick={() => handleNicheClick(niche.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-xs font-semibold transition-all duration-200",
                "hover:scale-105 active:scale-95 min-h-[72px]",
                isActive
                  ? `bg-gradient-to-br ${niche.gradient} text-white shadow-lg`
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                isActive
                  ? "bg-white/20"
                  : `bg-gradient-to-br ${niche.gradient} text-white`
              )}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="truncate w-full text-center">{niche.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DiscoveryFilters;
