import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search as SearchIcon, 
  Filter, 
  Grid,
  List,
  User,
  Star
} from 'lucide-react';
import { useSearch, SearchFilters } from '@/hooks/useSearch';
import CreatorSearchCard from '@/components/CreatorSearchCard';
import SearchBar from '@/components/SearchBar';
import SEOHead from '@/components/SEOHead';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilters,
    results,
    categories,
    featuredCreators,
    isLoading,
    clearSearch,
  } = useSearch();

  // Initialize search from URL params (optimisé)
  useEffect(() => {
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    
    if (query && query !== searchTerm) {
      setSearchTerm(query);
    }
    
    if (category && category !== filters.category) {
      updateFilters({ category });
    }
  }, [searchParams]);

  // Update URL when search changes (optimisé avec délai)
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

  // Options des filtres - Genre uniquement
  const genderOptions = [
    { value: 'femme', label: 'Femme', icon: User },
    { value: 'homme', label: 'Homme', icon: User },
    { value: 'non-binaire', label: 'Non-binaire', icon: User },
    { value: 'trans', label: 'Trans', icon: User }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEOHead 
        title="Rechercher des Créateurs - CreatorHub"
        description="Trouvez et découvrez les meilleurs créateurs de contenu sur CreatorHub. Filtrez par catégorie, genre, type de contenu. Des milliers de créateurs français vous attendent."
        keywords="recherche créateurs, découvrir créateurs, créateurs contenu France, streamers français, influenceurs"
        url="https://creatorhub.com/search"
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {hasActiveFilters ? 'Résultats de recherche' : 'Découvrir des créateurs'}
          </h1>
          
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-4">
            <SearchBar className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
            </Button>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-muted-foreground">Filtres actifs:</span>
              {searchTerm && (
                <Badge variant="secondary">
                  Recherche: "{searchTerm}"
                </Badge>
              )}
              {filters.category && (
                <Badge variant="secondary">
                  Catégorie: {filters.category}
                </Badge>
              )}
              {filters.gender && (
                <Badge variant="secondary">
                  Genre: {genderOptions.find(g => g.value === filters.gender)?.label}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Effacer tout
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className={`sticky top-24 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filtres</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Catégorie</Label>
                  <Select
                    value={filters.category || 'all'}
                    onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map(({ category }) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Genre du créateur</Label>
                  <Select
                    value={filters.gender || 'all'}
                    onValueChange={(value) => handleFilterChange('gender', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les genres</SelectItem>
                      {genderOptions.map(({ value, label, icon: Icon }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Quick Filters - Catégories suggérées */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Catégories suggérées</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Glamour', 'Agriculture', 'DJing', 'Mannequin', 'Pilote voiture', 'Gaming', 'Fitness', 'Musique', 'Art'].map((cat) => (
                      <Badge
                        key={cat}
                        variant={filters.category === cat ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleFilterChange('category', filters.category === cat ? undefined : cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                {hasResults ? (
                  <p className="text-muted-foreground">
                    {results.length} créateur{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                    {searchTerm && ` pour "${searchTerm}"`}
                  </p>
                ) : hasActiveFilters ? (
                  <p className="text-muted-foreground">Aucun résultat trouvé</p>
                ) : (
                  <p className="text-muted-foreground">Explorez les créateurs</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Results */}
            {!isLoading && hasResults && (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                  : "space-y-4"
              }>
                {results.map((creator) => (
                  <CreatorSearchCard
                    key={creator.id}
                    creator={creator}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && !hasResults && hasActiveFilters && (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun résultat trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Essayez de modifier vos critères de recherche ou explorez les créateurs populaires.
                </p>
                <Button onClick={clearAllFilters} variant="outline">
                  Effacer les filtres
                </Button>
              </div>
            )}

            {/* Featured Creators (when no search) */}
            {!isLoading && !hasActiveFilters && featuredCreators.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Créateurs en vedette</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredCreators.slice(0, 6).map((creator) => (
                    <CreatorSearchCard
                      key={creator.id}
                       creator={{
                         ...creator,
                         similarity_score: 1,
                       }}
                    />
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