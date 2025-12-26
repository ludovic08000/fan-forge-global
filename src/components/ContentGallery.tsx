import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Grid, List } from 'lucide-react';
import ContentCard from './ContentCard';
import { useContent } from '@/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ContentGallery: React.FC = () => {
  const { contents, isLoading, likeMutation, isContentLiked } = useContent();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [selected, setSelected] = useState<any>(null);

  const handleLike = (contentId: string) => {
    likeMutation.mutate(contentId);
  };

  const filteredContents = contents?.filter(content => {
    // Filtre par terme de recherche
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par type (gratuit/premium)
    const matchesFilter = filter === 'all' || 
                         (filter === 'free' && !content.is_premium) ||
                         (filter === 'premium' && content.is_premium);

    return matchesSearch && matchesFilter;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher du contenu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="free">Gratuit</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredContents.length} contenu{filteredContents.length > 1 ? 's' : ''} trouvé{filteredContents.length > 1 ? 's' : ''}
      </div>

      {/* Content Grid */}
      {filteredContents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun contenu trouvé</p>
            <p className="text-sm">Essayez de modifier vos filtres ou votre recherche</p>
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredContents.map((content: any) => (
            <ContentCard
              key={content.id}
              content={content}
              onLike={handleLike}
              isLiked={isContentLiked(content.id)}
              showCreatorInfo={true}
              onOpenFreeImage={(c) => setSelected(c)}
            />
          ))}
        </div>
      )}

      {/* Load More Button (pour la pagination future) */}
      {filteredContents.length > 0 && filteredContents.length % 20 === 0 && (
        <div className="text-center">
          <Button variant="outline" size="lg">
            Charger plus de contenu
          </Button>
        </div>
      )}

      {/* Lightbox pour contenu gratuit (images) */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="z-[1000] w-[95vw] max-w-none h-[90vh] p-0 overflow-hidden bg-black/95" aria-describedby="gallery-image-description">
          <DialogHeader className="sr-only">
            <DialogTitle>{selected?.title || 'Image'}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={selected.thumbnail_url || selected.file_url}
                alt={selected.title}
                className="max-w-full max-h-full object-contain"
              />
              <div id="gallery-image-description" className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <h3 className="text-white text-xl font-bold mb-2">{selected.title}</h3>
                {selected.description && (
                  <p className="text-white/80 text-sm mb-3">{selected.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentGallery;