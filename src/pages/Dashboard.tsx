import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Eye, Heart, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Simulate loading time
      setTimeout(() => setLoadingData(false), 1000);
    }
  }, [user]);

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = (email: string) => {
    return email.split('@')[0];
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Mon Profil</CardTitle>
                <CardDescription>Informations personnelles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {getDisplayName(user.email || '')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    0 vues
                  </span>
                </div>

                <Button variant="outline" className="w-full">
                  Modifier le profil
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Card */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span>Tableau de bord</span>
                </CardTitle>
                <CardDescription>
                  Bienvenue sur votre espace personnel, {getDisplayName(user.email || '')}!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-secondary">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Abonnés</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary">
                    <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">J'aime</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary">
                    <Eye className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Vues</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon Card */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Fonctionnalités à venir</CardTitle>
                <CardDescription>
                  De nouvelles fonctionnalités seront bientôt disponibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Système de profils complet</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Upload d'avatars</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Système de followers</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Création de posts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;