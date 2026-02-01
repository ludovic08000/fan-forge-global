import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Dumbbell, Gamepad2, ChefHat, Sparkles, Heart, Music, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryFiltersProps {
  className?: string;
}

const NICHES = [
  { id: 'Coach sportif', label: 'Coach sportif', icon: Dumbbell },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'Cuisine', label: 'Cuisine', icon: ChefHat },
  { id: 'Glamour', label: 'Glamour', icon: Sparkles },
  { id: 'Lifestyle', label: 'Lifestyle', icon: Heart },
  { id: 'DJing', label: 'DJing', icon: Music },
  { id: 'Mannequin', label: 'Mannequin', icon: Camera },
];

const GENDERS = [
  { id: 'homme', label: 'Homme' },
  { id: 'femme', label: 'Femme' },
  { id: 'autre', label: 'Autre' },
];

const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({ className }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm);
    if (selectedNiche) params.set('category', selectedNiche);
    if (selectedGender) params.set('gender', selectedGender);
    
    navigate(`/search?${params.toString()}`);
  };

  const handleNicheClick = (nicheId: string) => {
    const newNiche = selectedNiche === nicheId ? null : nicheId;
    setSelectedNiche(newNiche);
    
    // Navigation directe vers la recherche avec le filtre
    const params = new URLSearchParams();
    if (newNiche) params.set('category', newNiche);
    if (selectedGender) params.set('gender', selectedGender);
    navigate(`/search?${params.toString()}`);
  };

  const handleGenderClick = (genderId: string) => {
    const newGender = selectedGender === genderId ? null : genderId;
    setSelectedGender(newGender);
    
    // Navigation directe vers la recherche avec le filtre
    const params = new URLSearchParams();
    if (selectedNiche) params.set('category', selectedNiche);
    if (newGender) params.set('gender', newGender);
    navigate(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedNiche(null);
    setSelectedGender(null);
  };

  const hasActiveFilters = selectedNiche || selectedGender || searchTerm;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un créateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-10 pr-10 h-12 text-base bg-card border-border"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filtres par genre */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Genre</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((gender) => (
            <Badge
              key={gender.id}
              variant={selectedGender === gender.id ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105",
                selectedGender === gender.id 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "hover:bg-primary/10 hover:border-primary"
              )}
              onClick={() => handleGenderClick(gender.id)}
            >
              {gender.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Filtres par niche */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Catégorie</p>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((niche) => {
            const Icon = niche.icon;
            return (
              <Badge
                key={niche.id}
                variant={selectedNiche === niche.id ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm transition-all hover:scale-105 flex items-center gap-1.5",
                  selectedNiche === niche.id 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "hover:bg-primary/10 hover:border-primary"
                )}
                onClick={() => handleNicheClick(niche.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {niche.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Bouton effacer les filtres */}
      {hasActiveFilters && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer les filtres
          </Button>
        </div>
      )}
    </div>
  );
};

export default DiscoveryFilters;
