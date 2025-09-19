import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Star } from 'lucide-react';

const PopularProfiles = () => {
  // Temporary mock data until Supabase types are updated
  const mockProfiles = [
    {
      id: '1',
      first_name: 'Sophie',
      last_name: 'Martin',
      avatar_url: null,
      bio: 'Créatrice de contenu lifestyle et voyage',
      view_count: 1250
    },
    {
      id: '2', 
      first_name: 'Lucas',
      last_name: 'Dubois',
      avatar_url: null,
      bio: 'Photographe professionnel et formateur',
      view_count: 980
    },
    {
      id: '3',
      first_name: 'Emma',
      last_name: 'Rousseau',
      avatar_url: null,
      bio: 'Coach fitness et nutrition',
      view_count: 856
    }
  ];

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  const getDisplayName = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return 'Utilisateur';
  };

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4" />
            <span>Découverte</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">Créateurs Populaires</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez les créateurs les plus suivis et leurs contenus exclusifs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {mockProfiles.map((profile, index) => (
            <Card 
              key={profile.id} 
              className="border-border bg-card hover:shadow-lg transition-all duration-300 hover:shadow-primary/10 group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(profile.first_name, profile.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {getDisplayName(profile.first_name, profile.last_name)}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">{profile.view_count} vues</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {profile.bio && (
                  <CardDescription className="mb-4 line-clamp-2">
                    {profile.bio}
                  </CardDescription>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Créateur</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    Voir le profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Voir tous les créateurs
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PopularProfiles;