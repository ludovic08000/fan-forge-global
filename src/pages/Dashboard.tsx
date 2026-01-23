/**
 * Page Dashboard - Interface simplifiée pour créateurs
 * Design intuitif avec sections claires
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, BarChart3, ImageIcon, Radio, MessageCircle, Sparkles, Settings, Banknote, Handshake } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from '@/lib/analytics';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useContent } from '@/hooks/useContent';

// Dashboard Components
import {
  DashboardHeader,
  DashboardNav,
  DashboardStats,
  DashboardQuickActions,
  DashboardRecentContent,
  DashboardContentGrid,
  DashboardStripeAlert,
  DashboardPricingSection,
  DashboardSettingsSection,
  type DashboardSection,
} from '@/components/dashboard';

// Lazy-loaded components
const LiveStreamStudio = lazy(() => import('@/components/LiveStreamStudio').then(m => ({ default: m.LiveStreamStudio })));
const ContentUpload = lazy(() => import('@/components/ContentUpload'));
const CreatorMessages = lazy(() => import('@/components/CreatorMessages'));
const CreatorAnalyticsDashboard = lazy(() => import('@/components/analytics/CreatorAnalyticsDashboard'));
const PaymentRequest = lazy(() => import('@/components/creator/PaymentRequest'));
const PartnershipManager = lazy(() => import('@/components/creator/PartnershipManager'));
const MediaLightbox = lazy(() => import('@/components/MediaLightbox'));
const PhotoEditor = lazy(() => import('@/components/PhotoEditor'));

// Fallback components
const LoadingFallback = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin mb-4" />
    <p>{message}</p>
  </div>
);

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const { useMyContent } = useContent();
  const { trackPageView } = useAnalytics();
  const { unreadCount } = useUnreadMessages();
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  
  // State
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [creatorStats, setCreatorStats] = useState({
    totalEarnings: 0,
    totalSubscribers: 0,
    totalViews: 0,
    totalLikes: 0
  });
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [isCreatorLocal, setIsCreatorLocal] = useState<boolean | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Navigation lightbox
  const handleOpenLightbox = (content: any, index: number) => {
    setSelectedContent(content);
    setLightboxIndex(index);
  };

  const handlePreviousImage = () => {
    if (myContent && lightboxIndex > 0) {
      const newIndex = lightboxIndex - 1;
      setLightboxIndex(newIndex);
      setSelectedContent(myContent[newIndex]);
    }
  };

  const handleNextImage = () => {
    if (myContent && lightboxIndex < myContent.length - 1) {
      const newIndex = lightboxIndex + 1;
      setLightboxIndex(newIndex);
      setSelectedContent(myContent[newIndex]);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) return;
    
    try {
      const { error } = await supabase.from('content').delete().eq('id', contentId);
      if (error) throw error;
      toast.success('Contenu supprimé');
      refetch();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Effects
  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  useEffect(() => {
    const checkIfCreator = async () => {
      if (!user) {
        setIsCreatorLocal(false);
        return;
      }
      try {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsCreatorLocal(!!creatorData);
      } catch (error) {
        console.error('Error checking creator status:', error);
        setIsCreatorLocal(false);
      }
    };
    checkIfCreator();
  }, [user]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        if (profileData?.username) {
          setShareLink(`${window.location.origin}/${profileData.username}`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadUserProfile();
  }, [user]);

  // Load creator stats
  const loadCreatorStats = async () => {
    if (!user || isCreatorLocal !== true) return;
    try {
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id, total_earnings, total_subscribers, total_content, featured_until, stripe_account_status, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorData) {
        setCreatorProfile(creatorData);
        setStripeConnected(creatorData.stripe_account_status === 'active' && creatorData.stripe_payouts_enabled);
        
        const { data: contentStats } = await supabase
          .from('content')
          .select('id, view_count, like_count')
          .eq('creator_id', creatorData.id);

        const totalViews = contentStats?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;
        const totalLikes = contentStats?.reduce((sum, content) => sum + (content.like_count || 0), 0) || 0;

        setCreatorStats({
          totalEarnings: creatorData.total_earnings || 0,
          totalSubscribers: creatorData.total_subscribers || 0,
          totalViews,
          totalLikes
        });
      }
    } catch (error) {
      console.error('Error loading creator stats:', error);
    }
  };

  useEffect(() => {
    loadCreatorStats();
  }, [user, isCreatorLocal]);

  // Realtime subscriptions for stats
  useEffect(() => {
    if (!user || isCreatorLocal !== true || !creatorProfile?.id) return;

    const viewsChannel = supabase
      .channel('realtime-views')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_views' },
        async (payload) => {
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.new.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({ ...prev, totalViews: prev.totalViews + 1 }));
          }
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('realtime-likes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_likes' },
        async (payload) => {
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.new.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({ ...prev, totalLikes: prev.totalLikes + 1 }));
          }
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'content_likes' },
        async (payload) => {
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.old.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({ ...prev, totalLikes: Math.max(0, prev.totalLikes - 1) }));
          }
        }
      )
      .subscribe();

    const subscribersChannel = supabase
      .channel('realtime-subscribers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `creator_id=eq.${creatorProfile.id}` },
        () => loadCreatorStats()
      )
      .subscribe();

    const tipsChannel = supabase
      .channel('realtime-tips')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tips', filter: `creator_id=eq.${creatorProfile.id}` },
        (payload) => {
          const tipAmount = payload.new.amount || 0;
          setCreatorStats(prev => ({ ...prev, totalEarnings: prev.totalEarnings + tipAmount }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(subscribersChannel);
      supabase.removeChannel(tipsChannel);
    };
  }, [user, isCreatorLocal, creatorProfile?.id]);

  // URL params handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('boost_success') === 'true') {
      toast.success('Boost activé !');
      setTimeout(() => window.location.reload(), 2000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('boost_canceled') === 'true') {
      toast.error('Achat de boost annulé.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get('stripe_connect') === 'success') {
      toast.success('Vérification Stripe en cours...');
      supabase.functions.invoke('check-stripe-connect-status')
        .then(({ data, error }) => {
          if (!error && data?.payouts_enabled) {
            toast.success('Stripe Connect activé !');
          }
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        });
    }
  }, []);

  // Loading state
  if (loading || isCreatorLocal === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Auth checks
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isCreator = isCreatorLocal === true || userRole === 'creator' || userRole === 'admin';

  if (!isCreator) {
    return <Navigate to="/subscriptions" replace />;
  }

  // Menu items
  const menuItems = [
    { id: 'overview' as DashboardSection, label: 'Aperçu', icon: BarChart3, badge: 0 },
    { id: 'content' as DashboardSection, label: 'Mon contenu', icon: ImageIcon, badge: 0 },
    { id: 'live' as DashboardSection, label: 'Live', icon: Radio, badge: 0 },
    { id: 'messages' as DashboardSection, label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { id: 'analytics' as DashboardSection, label: 'Statistiques', icon: BarChart3, badge: 0 },
    { id: 'partnerships' as DashboardSection, label: 'Partenariats', icon: Handshake, badge: 0 },
    { id: 'pricing' as DashboardSection, label: 'Abonnement & Boost', icon: Sparkles, badge: 0 },
    { id: 'settings' as DashboardSection, label: 'Paramètres', icon: Settings, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-16">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <DashboardHeader
          user={user}
          shareLink={shareLink}
          copied={copied}
          onCopyLink={handleCopyLink}
          onNewContent={() => setShowUpload(true)}
        />

        {/* Stripe Alert */}
        {!stripeConnected && (
          <DashboardStripeAlert onConfigure={() => setActiveSection('settings')} />
        )}

        {/* Navigation */}
        <DashboardNav
          menuItems={menuItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Upload Dialog */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter du contenu</DialogTitle>
              <DialogDescription>Partagez une nouvelle photo ou vidéo avec votre audience</DialogDescription>
            </DialogHeader>
            <Suspense fallback={<LoadingFallback />}>
              <ContentUpload 
                onUploadComplete={() => {
                  setShowUpload(false);
                  refetch();
                }} 
              />
            </Suspense>
          </DialogContent>
        </Dialog>

        {/* Section: Overview */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <DashboardStats stats={creatorStats} />
            <DashboardQuickActions 
              onNewContent={() => setShowUpload(true)}
              onSectionChange={setActiveSection}
            />
            <DashboardRecentContent
              content={myContent}
              isLoading={contentLoading}
              onOpenLightbox={handleOpenLightbox}
              onEditContent={setEditingContent}
              onNewContent={() => setShowUpload(true)}
              onViewAll={() => setActiveSection('content')}
            />
            
            {/* Payments */}
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-border/50">
                <Banknote className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-lg">Paiements</h3>
              </div>
              <div className="p-5">
                <Suspense fallback={<LoadingFallback />}>
                  <PaymentRequest />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* Section: Content */}
        {activeSection === 'content' && (
          <DashboardContentGrid
            content={myContent}
            isLoading={contentLoading}
            onOpenLightbox={handleOpenLightbox}
            onEditContent={setEditingContent}
            onDeleteContent={handleDeleteContent}
            onNewContent={() => setShowUpload(true)}
          />
        )}

        {/* Section: Live */}
        {activeSection === 'live' && (
          <Suspense fallback={<LoadingFallback message="Chargement du studio live..." />}>
            <LiveStreamStudio />
          </Suspense>
        )}

        {/* Section: Messages */}
        {activeSection === 'messages' && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorMessages />
          </Suspense>
        )}

        {/* Section: Analytics */}
        {activeSection === 'analytics' && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorAnalyticsDashboard />
          </Suspense>
        )}

        {/* Section: Partnerships */}
        {activeSection === 'partnerships' && (
          <Suspense fallback={<LoadingFallback />}>
            <PartnershipManager />
          </Suspense>
        )}

        {/* Section: Pricing & Boost */}
        {activeSection === 'pricing' && creatorProfile?.id && (
          <DashboardPricingSection creatorId={creatorProfile.id} />
        )}

        {/* Section: Settings */}
        {activeSection === 'settings' && creatorProfile?.id && (
          <DashboardSettingsSection 
            stripeConnected={stripeConnected} 
            creatorId={creatorProfile.id}
          />
        )}

        {/* Lightbox */}
        {selectedContent && (
          <Suspense fallback={null}>
            <MediaLightbox
              isOpen={!!selectedContent}
              onClose={() => setSelectedContent(null)}
              mediaUrl={selectedContent.file_url}
              mediaType={selectedContent.content_type === 'video' ? 'video' : 'image'}
              title={selectedContent.title}
              contentId={selectedContent.id}
              isPremium={selectedContent.is_premium === true}
              onPrevious={lightboxIndex > 0 ? handlePreviousImage : undefined}
              onNext={myContent && lightboxIndex < myContent.length - 1 ? handleNextImage : undefined}
            />
          </Suspense>
        )}

        {/* Photo Editor */}
        {editingContent && (
          <Suspense fallback={null}>
            <PhotoEditor
              isOpen={!!editingContent}
              onClose={() => setEditingContent(null)}
              imageUrl={editingContent.file_url}
              contentId={editingContent.id}
              onSave={() => {
                setEditingContent(null);
                refetch();
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
