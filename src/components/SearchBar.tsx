import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, TrendingUp, Crown } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  className,
  placeholder = "Rechercher des créateurs..." 
}) => {
  const navigate = useNavigate();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { 
    searchTerm, 
    setSearchTerm, 
    suggestions, 
    categories,
    featuredCreators,
    isLoading 
  } = useSearch();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (term?: string) => {
    const finalTerm = term || searchTerm;
    if (finalTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(finalTerm)}`);
      setShowSuggestions(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleCreatorClick = (usernameOrId: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);
    if (isUUID) {
      navigate(`/creator/${usernameOrId}`);
    } else {
      navigate(`/${usernameOrId}`);
    }
    setShowSuggestions(false);
    setIsFocused(false);
    setSearchTerm('');
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const showResults = isFocused && (searchTerm.length >= 2 || showSuggestions);

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-lg", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyPress}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch()}
            className="h-6 px-2 text-xs"
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3">
            {/* Search Term Results */}
            {searchTerm.length >= 2 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Créateurs</h4>
                  {isLoading && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
                
                {suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.map((creator) => {
                      const creatorName = creator.stage_name || creator.display_name || creator.username || 'Créateur';
                      return (
                        <div
                          key={creator.id}
                          onClick={() => handleCreatorClick(creator.username || creator.user_id)}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={creator.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {creatorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium truncate">{creatorName}</p>
                              {creator.is_verified && (
                                <Crown className="h-3 w-3 text-primary" />
                              )}
                              {creator.is_featured && (
                                <Badge variant="secondary" className="text-xs">
                                  <TrendingUp className="h-2 w-2 mr-1" />
                                  Boost
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              {creator.category && <span>{creator.category}</span>}
                              <span>•</span>
                              <span>{creator.total_subscribers} abonnés</span>
                              {creator.subscription_price > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{creator.subscription_price}€/mois</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {suggestions.length >= 5 && (
                      <Button
                        variant="ghost"
                        onClick={() => handleSearch()}
                        className="w-full text-sm text-primary"
                      >
                        Voir tous les résultats pour "{searchTerm}"
                      </Button>
                    )}
                  </div>
                ) : searchTerm.length >= 2 && !isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun créateur trouvé pour "{searchTerm}"
                  </p>
                ) : null}
              </div>
            )}

            {/* Categories */}
            {(!searchTerm || searchTerm.length < 2) && categories.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Catégories populaires</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 6).map(({ category, count }) => (
                    <Badge
                      key={category}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleCategoryClick(category)}
                    >
                      {category} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Creators */}
            {(!searchTerm || searchTerm.length < 2) && featuredCreators.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Créateurs en vedette</h4>
                <div className="space-y-2">
                  {featuredCreators.slice(0, 3).map((creator) => {
                    const creatorName = creator.stage_name || creator.display_name || creator.username || 'Créateur';
                    return (
                      <div
                        key={creator.id}
                        onClick={() => handleCreatorClick(creator.username || creator.user_id)}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={creator.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {creatorName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium truncate">{creatorName}</p>
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="h-2 w-2 mr-1" />
                              Featured
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {creator.total_subscribers} abonnés • {creator.category || 'Divers'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;