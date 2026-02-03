import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Handshake, Link2, ArrowLeft, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PartnershipsList } from '@/components/partnerships/PartnershipsList';
import { NewPartnershipDialog } from '@/components/partnerships/NewPartnershipDialog';
import { ReferralCodesManager } from '@/components/partnerships/ReferralCodesManager';
import { PartnershipStats } from '@/components/partnerships/PartnershipStats';
import { usePartnerships } from '@/hooks/usePartnerships';

const Partnerships = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCreatorId(data.id);
      }
      setLoading(false);
    };

    fetchCreator();
  }, [user]);

  const { partnerships, referralCodes, referralSubscriptions, isLoading } = usePartnerships(creatorId || undefined);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-[400px] w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être connecté pour accéder aux partenariats.
          </p>
          <Button onClick={() => navigate('/login')}>Se connecter</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!creatorId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Compte créateur requis</h1>
          <p className="text-muted-foreground mb-6">
            Les partenariats sont réservés aux créateurs. Devenez créateur pour débloquer cette fonctionnalité.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Devenir créateur</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const activePartnerships = partnerships.filter(p => p.status === 'accepted');
  const pendingPartnerships = partnerships.filter(p => p.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" />
              Partenariats
            </h1>
            <p className="text-muted-foreground">
              Collaborez avec d'autres créateurs pour gagner plus
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <PartnershipStats
          activePartnerships={activePartnerships.length}
          pendingPartnerships={pendingPartnerships.length}
          referralCodes={referralCodes.length}
          totalReferralEarnings={referralCodes.reduce((sum, c) => sum + Number(c.total_earnings), 0)}
        />

        <Tabs defaultValue="partnerships" className="mt-8">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="partnerships" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Partenariats
            </TabsTrigger>
            <TabsTrigger value="collaborations" className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Collaborations
            </TabsTrigger>
            <TabsTrigger value="affiliation" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Affiliation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partnerships">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mes partenariats</CardTitle>
                  <CardDescription>
                    Créez des partenariats permanents avec d'autres créateurs pour partager les revenus
                  </CardDescription>
                </div>
                <NewPartnershipDialog 
                  creatorId={creatorId} 
                  type="permanent"
                />
              </CardHeader>
              <CardContent>
                <PartnershipsList
                  partnerships={partnerships.filter(p => p.partnership_type === 'permanent' || !p.partnership_type)}
                  currentCreatorId={creatorId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Collaborations ponctuelles</CardTitle>
                  <CardDescription>
                    Collaborez sur un contenu spécifique et partagez les revenus générés
                  </CardDescription>
                </div>
                <NewPartnershipDialog 
                  creatorId={creatorId}
                  type="collaboration"
                />
              </CardHeader>
              <CardContent>
                <PartnershipsList
                  partnerships={partnerships.filter(p => p.partnership_type === 'collaboration')}
                  currentCreatorId={creatorId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Programme d'affiliation
                </CardTitle>
                <CardDescription>
                  Créez des codes de parrainage et gagnez une commission sur chaque nouvel abonné
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReferralCodesManager
                  creatorId={creatorId}
                  codes={referralCodes}
                  subscriptions={referralSubscriptions}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Partnerships;
