import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LiveAnalyticsDashboard } from '@/components/LiveAnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LiveAnalytics() {
  const { liveStreamId } = useParams<{ liveStreamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, [liveStreamId, user]);

  const checkAuthorization = async () => {
    if (!user || !liveStreamId) {
      navigate('/auth');
      return;
    }

    try {
      // Vérifier que l'utilisateur est le créateur de ce live
      const { data: stream, error } = await supabase
        .from('live_streams')
        .select('creator:creator_id(user_id)')
        .eq('id', liveStreamId)
        .single();

      if (error) throw error;

      if (stream?.creator?.user_id !== user.id) {
        toast.error('Vous n\'êtes pas autorisé à voir ces analytics');
        navigate('/dashboard');
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Error checking authorization:', error);
      toast.error('Erreur lors de la vérification des permissions');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Button>
        <h1 className="text-3xl font-bold">Analytics du Live</h1>
        <p className="text-muted-foreground mt-2">
          Statistiques détaillées de votre live stream
        </p>
      </div>

      <LiveAnalyticsDashboard liveStreamId={liveStreamId!} />
    </div>
  );
}
