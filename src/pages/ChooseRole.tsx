import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Video } from 'lucide-react';
import { toast } from 'sonner';

const ChooseRole = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRoleSelection = async (role: 'subscriber' | 'creator') => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Créer le rôle dans user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role
        });

      if (roleError) throw roleError;

      // Si créateur, créer l'entrée dans la table creators
      if (role === 'creator') {
        const { error: creatorError } = await supabase
          .from('creators')
          .insert({
            user_id: user.id,
            subscription_price: 9.99
          });

        if (creatorError) throw creatorError;
      }

      toast.success(role === 'creator' ? 'Compte créateur créé avec succès!' : 'Bienvenue!');
      navigate('/');
      window.location.reload(); // Recharger pour mettre à jour le contexte
    } catch (error: any) {
      console.error('Error setting role:', error);
      toast.error('Erreur lors de la création du compte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Choisissez votre type de compte
          </h1>
          <p className="text-muted-foreground">
            Sélectionnez le rôle qui vous correspond
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <UserCircle className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Utilisateur</CardTitle>
              <CardDescription className="text-base">
                Accédez au contenu exclusif de vos créateurs préférés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Abonnez-vous aux créateurs
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Accédez au contenu premium
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Regardez des lives exclusifs
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Messagerie privée
                </li>
              </ul>
              <Button
                onClick={() => handleRoleSelection('subscriber')}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                Devenir utilisateur
              </Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all hover:scale-105 cursor-pointer group border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Video className="w-10 h-10 text-accent" />
              </div>
              <CardTitle className="text-2xl">Créateur</CardTitle>
              <CardDescription className="text-base">
                Partagez votre contenu et monétisez votre audience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Publiez du contenu exclusif
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Lancez des lives en direct
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Recevez des abonnements
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Monétisez votre communauté
                </li>
              </ul>
              <Button
                onClick={() => handleRoleSelection('creator')}
                disabled={loading}
                className="w-full"
                size="lg"
                variant="default"
              >
                Devenir créateur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;
