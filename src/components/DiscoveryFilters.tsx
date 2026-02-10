import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Dumbbell, Gamepad2, ChefHat, Sparkles, Heart, Music, Camera, Gavel, Trophy, Dribbble, Crown, User } from 'lucide-react';
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
      <div className="flex flex-wrap justify-center gap-2.5">
        {NICHES.map((niche, index) => {
          const Icon = niche.icon;
          const isActive = selectedNiche === niche.id;
          return (
            <motion.button
              key={niche.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              onClick={() => handleNicheClick(niche.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                "border shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : "bg-card/80 backdrop-blur-sm text-foreground border-border/50 hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <Icon className="h-4 w-4" />
              {niche.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DiscoveryFilters;
