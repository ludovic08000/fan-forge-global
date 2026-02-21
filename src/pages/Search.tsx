import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search as SearchIcon, Filter, Grid, List, User, Star } from 'lucide-react';
import { useSearch, SearchFilters } from '@/hooks/useSearch';
import CreatorSearchCard from '@/components/CreatorSearchCard';
import SearchBar from '@/components/SearchBar';
import SEOHead from '@/components/SEOHead';
import { useTranslation } from '@/contexts/TranslationContext';

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
    { value: 'femme', label: t('signup.female'), icon: User },
    { value: 'homme', label: t('signup.male'), icon: User },
    { value: 'non-binaire', label: t('signup.nonBinary'), icon: User },
    { value: 'trans', label: 'Trans', icon: User }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEOHead 
        title={t('search.title')}
        description={t('search.discoverCreators')}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {hasActiveFilters ? t('search.searchResults') : t('search.discoverCreators')}
          </h1>
          
          <div className="flex items-center space-x-4 mb-4">
            <SearchBar className="flex-1" />
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>{t('common.filters')}</span>
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-muted-foreground">{t('search.activeFilters')}</span>
              {searchTerm && <Badge variant="secondary">{t('common.search')}: "{searchTerm}"</Badge>}
              {filters.category && <Badge variant="secondary">{t('search.category')}: {filters.category}</Badge>}
              {filters.gender && (
                <Badge variant="secondary">
                  {t('search.creatorGender')}: {genderOptions.find(g => g.value === filters.gender)?.label}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>{t('common.clearAll')}</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card className={`sticky top-24 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>{t('common.filters')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('search.category')}</Label>
                  <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}>
                    <SelectTrigger><SelectValue placeholder={t('search.allCategories')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.allCategories')}</SelectItem>
                      {categories.map(({ category }) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('search.creatorGender')}</Label>
                  <Select value={filters.gender || 'all'} onValueChange={(value) => handleFilterChange('gender', value === 'all' ? undefined : value)}>
                    <SelectTrigger><SelectValue placeholder={t('search.allGenders')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.allGenders')}</SelectItem>
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

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('search.suggestedCategories')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Glamour', 'Gaming', 'Coach sportif', 'Cuisine', 'DJing', 'Lifestyle', 'Mannequin'].map((cat) => (
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

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                {hasResults ? (
                  <p className="text-muted-foreground">
                    {results.length} {t('search.creatorsFound')}
                    {searchTerm && ` ${t('search.forQuery')} "${searchTerm}"`}
                  </p>
                ) : hasActiveFilters ? (
                  <p className="text-muted-foreground">{t('search.noResultFound')}</p>
                ) : (
                  <p className="text-muted-foreground">{t('search.exploreCreators')}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
                  <Grid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
                {results.map((creator) => (
                  <CreatorSearchCard key={creator.id} creator={creator} compact={viewMode === 'list'} />
                ))}
              </div>
            )}

            {!isLoading && !hasResults && hasActiveFilters && (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('search.noCreatorFound')}</h3>
                <p className="text-muted-foreground mb-4">{t('search.noCreatorInCategory')}</p>
                <Button onClick={() => navigate('/')} variant="outline">{t('search.backToHome')}</Button>
              </div>
            )}

            {!isLoading && !hasActiveFilters && featuredCreators.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">{t('search.featuredCreators')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredCreators.slice(0, 6).map((creator) => (
                    <CreatorSearchCard key={creator.id} creator={{ ...creator, similarity_score: 1 }} />
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
