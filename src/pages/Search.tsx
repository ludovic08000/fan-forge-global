import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search as SearchIcon, Filter, Grid, List, User, Star, X,
  Sparkles, Heart, Music, Gamepad2, Gavel, Trophy, Dribbble,
  Dumbbell, ChefHat, Crown, Camera, Palette, GraduationCap,
  BookOpen, Sprout, Plane, Cpu, SlidersHorizontal
} from 'lucide-react';
import { useSearch, SearchFilters } from '@/hooks/useSearch';
import CreatorSearchCard from '@/components/CreatorSearchCard';
import SearchBar from '@/components/SearchBar';
import SEOHead from '@/components/SEOHead';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const NICHE_MAP: Record<string, { icon: React.ElementType; gradient: string }> = {
  'Glamour': { icon: Sparkles, gradient: 'from-pink-500 to-rose-500' },
  'Lifestyle': { icon: Heart, gradient: 'from-red-500 to-pink-500' },
  'DJing': { icon: Music, gradient: 'from-violet-500 to-purple-500' },
  'Gaming': { icon: Gamepad2, gradient: 'from-emerald-500 to-green-500' },
  'Avocat': { icon: Gavel, gradient: 'from-amber-500 to-yellow-500' },
  'Football': { icon: Trophy, gradient: 'from-sky-500 to-blue-500' },
  'Basketball': { icon: Dribbble, gradient: 'from-orange-500 to-amber-500' },
  'Coach sportif': { icon: Dumbbell, gradient: 'from-teal-500 to-cyan-500' },
  'Cuisine': { icon: ChefHat, gradient: 'from-rose-500 to-red-500' },
  'Luxe': { icon: Crown, gradient: 'from-yellow-500 to-amber-400' },
  'Mannequin': { icon: Camera, gradient: 'from-indigo-500 to-violet-500' },
  'Art & Création': { icon: Palette, gradient: 'from-fuchsia-500 to-pink-500' },
  'Musique': { icon: Music, gradient: 'from-purple-500 to-indigo-500' },
  'Éducation': { icon: GraduationCap, gradient: 'from-blue-500 to-cyan-500' },
  'Culture': { icon: BookOpen, gradient: 'from-stone-500 to-amber-600' },
  'Agriculture': { icon: Sprout, gradient: 'from-lime-500 to-green-600' },
  'Voyage': { icon: Plane, gradient: 'from-cyan-500 to-blue-500' },
  'Tech & Innovation': { icon: Cpu, gradient: 'from-slate-500 to-zinc-600' },
};

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const { searchTerm, setSearchTerm, filters, updateFilters, results, categories, featuredCreators, isLoading, clearSearch } = useSearch();

  useEffect(() => {
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    if (query && query !== searchTerm) setSearchTerm(query);
    if (category && category !== filters.category) updateFilters({ category });
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (filters.category) params.set('category', filters.category);
      setSearchParams(params, { replace: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [searchTerm, filters.category]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    updateFilters({ [key]: value });
  };

  const clearAllFilters = () => {
    clearSearch();
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = searchTerm || filters.category || filters.gender;
  const hasResults = results.length > 0;

  const genderOptions = [
    { value: 'femme', label: t('signup.female') },
    { value: 'homme', label: t('signup.male') },
    { value: 'non-binaire', label: t('signup.nonBinary') },
    { value: 'trans', label: 'Trans' }
  ];

  const allCategoryKeys = Object.keys(NICHE_MAP);

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEOHead 
        title={t('search.title')}
        description={t('search.discoverCreators')}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
          >
            {hasActiveFilters ? t('search.searchResults') : t('search.discoverCreators')}
          </motion.h1>
          
          {/* Search + Filter toggle */}
          <div className="flex items-center gap-3 mb-5">
            <SearchBar className="flex-1" />
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 rounded-xl transition-all",
                showFilters && "shadow-lg"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.filters')}</span>
            </Button>
          </div>

          {/* Active filters badges */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 mb-4"
              >
                <span className="text-sm text-muted-foreground">{t('search.activeFilters')}</span>
                {searchTerm && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1.5 bg-primary/10 text-primary border-primary/20">
                    <SearchIcon className="h-3 w-3" />
                    "{searchTerm}"
                  </Badge>
                )}
                {filters.category && (() => {
                  const niche = NICHE_MAP[filters.category];
                  const Icon = niche?.icon || Filter;
                  return (
                    <Badge className={cn(
                      "rounded-full px-3 py-1 gap-1.5 text-white border-0 bg-gradient-to-r",
                      niche?.gradient || "from-primary to-primary/80"
                    )}>
                      <Icon className="h-3 w-3" />
                      {filters.category}
                    </Badge>
                  );
                })()}
                {filters.gender && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1.5 bg-accent/50">
                    <User className="h-3 w-3" />
                    {genderOptions.find(g => g.value === filters.gender)?.label}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground rounded-full gap-1">
                  <X className="h-3 w-3" />
                  {t('common.clearAll')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar filters */}
          <div className="lg:col-span-1">
            <div className={cn(
              "sticky top-24 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden transition-all",
              showFilters ? 'block' : 'hidden lg:block'
            )}>
              {/* Header */}
              <div className="p-5 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{t('common.filters')}</h3>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Gender select */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('search.creatorGender')}</label>
                  <Select value={filters.gender || 'all'} onValueChange={(value) => handleFilterChange('gender', value === 'all' ? undefined : value)}>
                    <SelectTrigger className="rounded-xl bg-background/50 border-border/50 h-11">
                      <SelectValue placeholder={t('search.allGenders')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.allGenders')}</SelectItem>
                      {genderOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

                {/* Category buttons - premium grid */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">{t('search.suggestedCategories')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allCategoryKeys.map((cat, index) => {
                      const niche = NICHE_MAP[cat];
                      const Icon = niche.icon;
                      const isActive = filters.category === cat;
                      return (
                        <motion.button
                          key={cat}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02, duration: 0.25 }}
                          onClick={() => handleFilterChange('category', isActive ? undefined : cat)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                            "hover:scale-[1.03] active:scale-[0.97]",
                            isActive
                              ? `bg-gradient-to-r ${niche.gradient} text-white shadow-lg shadow-primary/20`
                              : "bg-background/60 border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md"
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isActive
                              ? "bg-white/20"
                              : `bg-gradient-to-br ${niche.gradient} text-white`
                          )}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate">{cat}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                {hasResults ? (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{results.length}</span> {t('search.creatorsFound')}
                    {searchTerm && <span className="text-muted-foreground"> {t('search.forQuery')} "<span className="text-primary">{searchTerm}</span>"</span>}
                  </p>
                ) : hasActiveFilters ? (
                  <p className="text-muted-foreground">{t('search.noResultFound')}</p>
                ) : (
                  <p className="text-muted-foreground">{t('search.exploreCreators')}</p>
                )}
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn("h-8 w-8 p-0 rounded-lg", viewMode === 'grid' && "shadow-sm")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn("h-8 w-8 p-0 rounded-lg", viewMode === 'list' && "shadow-sm")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full border border-primary/10" />
                </div>
              </div>
            )}

            {!isLoading && hasResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}
              >
                {results.map((creator, i) => (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <CreatorSearchCard creator={creator} compact={viewMode === 'list'} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!isLoading && !hasResults && hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                  <SearchIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('search.noCreatorFound')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('search.noCreatorInCategory')}</p>
                <Button onClick={() => navigate('/')} variant="outline" className="rounded-xl gap-2">
                  {t('search.backToHome')}
                </Button>
              </motion.div>
            )}

            {!isLoading && !hasActiveFilters && featuredCreators.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <Star className="h-4.5 w-4.5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">{t('search.featuredCreators')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredCreators.slice(0, 6).map((creator, i) => (
                    <motion.div
                      key={creator.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <CreatorSearchCard creator={{ ...creator, similarity_score: 1 }} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
