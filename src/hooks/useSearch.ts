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
  gender: string | null;
  orientation: string | null;
  content_type: string[] | null;
}

export interface SearchFilters {
  category?: string;
  priceFilter: 'all' | 'free' | 'paid';
  featuredOnly: boolean;
  sortBy: 'relevance' | 'popularity' | 'newest';
  gender?: string;
  orientation?: string;
  contentTypes: string[];
}

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    priceFilter: 'all',
    featuredOnly: false,
    sortBy: 'relevance',
    contentTypes: [],
  });

  // Debounce search term avec délai plus court
  const debouncedSearch = useMemo(
    () => debounce((term: string) => setDebouncedSearchTerm(term), 150),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Main search query avec optimisations
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['search-creators', debouncedSearchTerm, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_creators', {
        search_term: debouncedSearchTerm,
        category_filter: filters.category || null,
        price_filter: filters.priceFilter,
        featured_only: filters.featuredOnly,
        gender_filter: filters.gender || null,
        orientation_filter: filters.orientation || null,
        content_type_filter: filters.contentTypes.length > 0 ? filters.contentTypes : null,
        limit_count: 50,
        offset_count: 0,
      });

      if (error) throw error;
      return data as SearchCreator[];
    },
    enabled: debouncedSearchTerm.length >= 2 || Object.values(filters).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== false && v !== 'all' && v !== 'relevance' && v !== undefined;
    }),
    staleTime: 30000, // Cache 30 secondes
    gcTime: 5 * 60 * 1000, // Garde en cache 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Suggestions for autocomplete (first 5 results)
  const suggestions = useMemo(() => {
    if (!results) return [];
    return results.slice(0, 5);
  }, [results]);

  // Liste des niches prédéfinies
  const predefinedCategories = [
    'Glamour',
    'Lifestyle',
    'DJing',
    'Gaming',
    'Avocat',
    'Football',
    'Basketball',
    'Coach sportif',
    'Cuisine',
    'Luxe',
    'Mannequin',
    'Art & Création',
    'Musique',
    'Éducation',
    'Culture',
    'Agriculture',
    'Voyage',
    'Tech & Innovation',
  ];

  // Get popular categories avec cache long - utilise la vue publique
  const { data: categories } = useQuery({
    queryKey: ['popular-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_creators')
        .select('category')
        .not('category', 'is', null)
        .neq('category', '')
        .order('total_subscribers', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Count occurrences
      const categoryCount = data.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Fusionner avec les catégories prédéfinies (toujours afficher toutes les niches)
      const allCategories = predefinedCategories.map(category => ({
        category,
        count: categoryCount[category] || 0,
      }));

      // Ajouter les catégories de la DB qui ne sont pas dans les prédéfinies
      Object.entries(categoryCount).forEach(([category, count]) => {
        if (!predefinedCategories.includes(category)) {
          allCategories.push({ category, count });
        }
      });

      return allCategories.sort((a, b) => b.count - a.count);
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde 10 minutes
  });

  // Get featured creators avec cache long - utilise la vue publique
  const { data: featuredCreators } = useQuery({
    queryKey: ['featured-creators'],
    queryFn: async () => {
      // Get featured creators from public view
      const { data: creators, error: creatorsError } = await supabase
        .from('public_creators')
        .select('*')
        .eq('is_featured', true)
        .order('total_subscribers', { ascending: false })
        .limit(10);

      if (creatorsError) throw creatorsError;
      if (!creators || creators.length === 0) return [];

      // Get profiles for these creators from public view
      const userIds = creators.map(c => c.user_id).filter(Boolean) as string[];
      const { data: profiles, error: profilesError } = await supabase
        .from('public_creator_profiles')
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
          gender: creator.gender || null,
          orientation: creator.orientation || null,
          content_type: creator.content_type || null,
        } as SearchCreator;
      });
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde 10 minutes
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
      contentTypes: [],
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