/**
 * Page Dashboard - Interface simplifiée pour créateurs
 * Design intuitif avec sections claires
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, BarChart3, ImageIcon, Radio, MessageCircle, Sparkles, Settings, Banknote, Handshake, Calendar, Video, BrainCircuit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from '@/lib/analytics';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useContent } from '@/hooks/useContent';
import { useTranslation } from '@/contexts/TranslationContext';

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
  DashboardPaymentsSection,
  type DashboardSection,
} from '@/components/dashboard';

// Lazy-loaded components
const LiveStreamStudio = lazy(() => import('@/components/LiveStreamStudio').then(m => ({ default: m.LiveStreamStudio })));
const ContentUpload = lazy(() => import('@/components/ContentUpload'));
const CreatorMessages = lazy(() => import('@/components/CreatorMessages'));
const CreatorAnalyticsDashboard = lazy(() => import('@/components/analytics/CreatorAnalyticsDashboard'));
const PaymentRequest = lazy(() => import('@/components/creator/PaymentRequest'));
const PaymentRequestCard = lazy(() => import('@/components/dashboard/PaymentRequestCard'));
const MediaLightbox = lazy(() => import('@/components/MediaLightbox'));
const PhotoEditor = lazy(() => import('@/components/PhotoEditor'));
const LiveHistory = lazy(() => import('@/components/live/LiveHistory'));
const DashboardPartnershipsSection = lazy(() => import('@/components/dashboard/DashboardPartnershipsSection'));
const DashboardAIMarketing = lazy(() => import('@/components/dashboard/DashboardAIMarketing'));

// Fallback components
const LoadingFallback = ({ message }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>{message || '...'}</p>
    </div>
  );
};

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const { t } = useTranslation();
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
  const [shareDisplayName, setShareDisplayName] = useState('');
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
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    
    try {
      // 1. Récupérer le file_url (R2 path) avant de supprimer
      const { data: contentData } = await supabase
        .from('content')
        .select('file_url')
        .eq('id', contentId)
        .single();

      // 2. Supprimer de la base de données
      const { error } = await supabase.from('content').delete().eq('id', contentId);
      if (error) throw error;

      // 3. Supprimer le fichier R2 (fire-and-forget)
      if (contentData?.file_url) {
        supabase.functions.invoke('delete-r2-file', {
          body: { filePath: contentData.file_url },
        }).catch(err => console.warn('R2 delete warning:', err));
      }

      toast.success(t('dashboard.contentDeleted'));
      refetch();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error(t('dashboard.deleteError'));
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(t('dashboard.linkCopied'));
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
        // Récupérer le stage_name du créateur pour l'URL de partage
        const { data: creatorData } = await supabase
          .from('creators')
          .select('stage_name')
          .eq('user_id', user.id)
          .single();
        
        // Créer le slug du stage_name pour l'URL (ex: "Ice Scream" -> "ice-scream")
        if (creatorData?.stage_name) {
          const stageNameSlug = creatorData.stage_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
            .replace(/^-|-$/g, ''); // Supprimer les tirets au début/fin
          
          setShareLink(`${window.location.origin}/${stageNameSlug}`);
          setShareDisplayName(creatorData.stage_name);
        } else {
          // Fallback sur le username si pas de stage_name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .single();
          
          if (profileData?.username) {
            setShareLink(`${window.location.origin}/${profileData.username}`);
            setShareDisplayName(profileData.username);
          }
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
        .select('id, total_subscribers, total_content, featured_until, stripe_account_status, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorData) {
        setCreatorProfile(creatorData);
        setStripeConnected(creatorData.stripe_account_status === 'active' && creatorData.stripe_payouts_enabled);
        
        // Calcul dynamique des revenus via RPC (plus précis que total_earnings)
        const { data: revenueData } = await supabase.rpc('calculate_creator_revenue_with_commission', {
          creator_uuid: creatorData.id,
          start_date: new Date(0).toISOString(), // Depuis le début
          end_date: new Date().toISOString(),
        });
        
        const totalEarnings = revenueData?.[0]?.total_after_commission || 0;
        
        const { data: contentStats } = await supabase
          .from('content')
          .select('id, view_count, like_count')
          .eq('creator_id', creatorData.id);

        const totalViews = contentStats?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;
        const totalLikes = contentStats?.reduce((sum, content) => sum + (content.like_count || 0), 0) || 0;

        setCreatorStats({
          totalEarnings,
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
    
    // Handle boost activation after Stripe checkout
    const sessionId = urlParams.get('session_id');
    if (urlParams.get('boost_success') === 'true' && sessionId) {
      toast.loading(t('dashboard.boostActivating'));
      supabase.functions.invoke('activate-creator-boost', {
        body: { session_id: sessionId }
      })
        .then(({ data, error }) => {
          toast.dismiss();
          if (error) {
            console.error('Boost activation error:', error);
            toast.error(t('dashboard.boostError'));
          } else if (data?.success) {
            toast.success(t('dashboard.boostActivated'));
          } else if (data?.error) {
            toast.error(data.error);
          }
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          loadCreatorStats(); // Refresh stats to show new boost status
        });
    } else if (urlParams.get('boost_success') === 'true') {
      // No session_id - might already be processed
      toast.success(t('dashboard.boostActivated'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('boost_cancelled') === 'true' || urlParams.get('boost_canceled') === 'true') {
      toast.error(t('dashboard.boostCancelled'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get('stripe_connect') === 'success') {
      toast.success(t('dashboard.stripeVerifying'));
      supabase.functions.invoke('check-stripe-connect-status')
        .then(({ data, error }) => {
          if (!error && data?.payouts_enabled) {
            toast.success(t('dashboard.stripeActivated'));
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
    { id: 'overview' as DashboardSection, label: t('dashboard.overview'), icon: BarChart3, badge: 0 },
    { id: 'content' as DashboardSection, label: t('dashboard.myContent'), icon: ImageIcon, badge: 0 },
    { id: 'live' as DashboardSection, label: t('dashboard.live'), icon: Radio, badge: 0 },
    { id: 'messages' as DashboardSection, label: t('dashboard.messages'), icon: MessageCircle, badge: unreadCount },
    { id: 'analytics' as DashboardSection, label: t('dashboard.analytics'), icon: BarChart3, badge: 0 },
    { id: 'ai-marketing' as DashboardSection, label: 'IA Marketing', icon: BrainCircuit, badge: 0 },
    { id: 'partnerships' as DashboardSection, label: t('dashboard.partnerships'), icon: Handshake, badge: 0 },
    { id: 'payments' as DashboardSection, label: t('dashboard.payments'), icon: Banknote, badge: 0 },
    { id: 'pricing' as DashboardSection, label: t('dashboard.subscriptionBoost'), icon: Sparkles, badge: 0 },
    { id: 'settings' as DashboardSection, label: t('dashboard.settings'), icon: Settings, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-16">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <DashboardHeader
          user={user}
          shareLink={shareLink}
          shareDisplayName={shareDisplayName}
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
              <DialogTitle>{t('dashboard.addContentTitle')}</DialogTitle>
              <DialogDescription>{t('dashboard.addContentDesc')}</DialogDescription>
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
          <div className="space-y-6">
            {/* Lien vers le calendrier des lives privés */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('dashboard.liveStudio')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.broadcastForSubscribers')}</p>
              </div>
              <Link to="/live-calendar">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 gap-2 border-0"
                >
                  <Sparkles className="h-5 w-5" />
                  <Video className="h-5 w-5" />
                  {t('dashboard.privateLives')}
                </Button>
              </Link>
            </div>
            <Suspense fallback={<LoadingFallback message={t('dashboard.loadingLiveStudio')} />}>
              <LiveStreamStudio />
            </Suspense>
            <Suspense fallback={<LoadingFallback />}>
              <LiveHistory />
            </Suspense>
          </div>
        )}

        {/* Section: Messages */}
        {activeSection === 'messages' && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorMessages />
          </Suspense>
        )}

        {/* Section: Analytics */}
        {activeSection === 'analytics' && (
          <Suspense fallback={<LoadingFallback message="Chargement des statistiques..." />}>
            <CreatorAnalyticsDashboard />
          </Suspense>
        )}

        {/* Section: Partnerships */}
        {activeSection === 'partnerships' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPartnershipsSection creatorId={creatorProfile.id} />
          </Suspense>
        )}

        {/* Section: Payments */}
        {activeSection === 'payments' && creatorProfile?.id && (
          <DashboardPaymentsSection creatorId={creatorProfile.id} />
        )}

        {/* Section: Pricing & Boost */}
        {activeSection === 'pricing' && creatorProfile?.id && (
          <DashboardPricingSection 
            creatorId={creatorProfile.id} 
            currentBoostUntil={creatorProfile.featured_until}
          />
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
