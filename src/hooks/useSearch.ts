import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash';

export interface SearchCreator {
  id: string;
  user_id: string;
  stage_name: string | null;
  category: string | null;
  subscription_price: number;
  currency: string;
  is_featured: boolean;
  total_subscribers: number;
  total_content: number;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  similarity_score: number;
}

export interface SearchFilters {
  category?: string;
  priceFilter: 'all' | 'free' | 'paid';
  featuredOnly: boolean;
  sortBy: 'relevance' | 'popularity' | 'newest';
}

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    priceFilter: 'all',
    featuredOnly: false,
    sortBy: 'relevance',
  });

  // Debounce search term
  const debouncedSearch = useMemo(
    () => debounce((term: string) => setDebouncedSearchTerm(term), 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Main search query
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['search-creators', debouncedSearchTerm, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_creators', {
        search_term: debouncedSearchTerm,
        category_filter: filters.category || null,
        price_filter: filters.priceFilter,
        featured_only: filters.featuredOnly,
        limit_count: 50,
        offset_count: 0,
      });

      if (error) throw error;
      return data as SearchCreator[];
    },
    enabled: debouncedSearchTerm.length >= 2 || Object.values(filters).some(v => v !== false && v !== 'all' && v !== undefined),
  });

  // Suggestions for autocomplete (first 5 results)
  const suggestions = useMemo(() => {
    if (!results) return [];
    return results.slice(0, 5);
  }, [results]);

  // Get popular categories
  const { data: categories } = useQuery({
    queryKey: ['popular-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('category')
        .not('category', 'is', null)
        .neq('category', '')
        .order('total_subscribers', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Count occurrences and return unique categories
      const categoryCount = data.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));
    },
  });

  // Get featured creators
  const { data: featuredCreators } = useQuery({
    queryKey: ['featured-creators'],
    queryFn: async () => {
      // Get featured creators
      const { data: creators, error: creatorsError } = await supabase
        .from('creators')
        .select('*')
        .eq('is_featured', true)
        .order('total_subscribers', { ascending: false })
        .limit(10);

      if (creatorsError) throw creatorsError;
      if (!creators || creators.length === 0) return [];

      // Get profiles for these creators
      const userIds = creators.map(c => c.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, is_verified')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Manually join the data
      return creators.map(creator => {
        const profile = profiles?.find(p => p.user_id === creator.user_id);
        return {
          ...creator,
          display_name: profile?.display_name || null,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          is_verified: profile?.is_verified || false,
          bio: null,
          similarity_score: 1,
        } as SearchCreator;
      });
    },
  });

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilters({
      priceFilter: 'all',
      featuredOnly: false,
      sortBy: 'relevance',
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilters,
    results: results || [],
    suggestions,
    categories: categories || [],
    featuredCreators: featuredCreators || [],
    isLoading,
    error,
    clearSearch,
  };
};