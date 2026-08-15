/**
 * Page Dashboard - Interface simplifiée pour créateurs
 * Design intuitif avec sections claires
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Loader2, Home, ImageIcon, Radio, MessageCircle, Settings, Banknote, Handshake,
  Video, BrainCircuit, Package, Gift, Vote, Camera, LineChart, User,
} from 'lucide-react';
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
  DashboardSidebar,
  DashboardMobileNav,
  DashboardRevenueChart,
  DashboardStats,
  DashboardQuickActions,
  DashboardRecentContent,
  DashboardContentGrid,
  DashboardStripeAlert,
  DashboardSettingsSection,
  type DashboardSection,
} from '@/components/dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

// Lazy-loaded components
const LiveStreamStudio = lazy(() => import('@/components/LiveStreamStudio').then(m => ({ default: m.LiveStreamStudio })));
const ContentUpload = lazy(() => import('@/components/ContentUpload'));
const CreatorMessages = lazy(() => import('@/components/CreatorMessages'));

const PaymentRequest = lazy(() => import('@/components/creator/PaymentRequest'));
const PaymentRequestCard = lazy(() => import('@/components/dashboard/PaymentRequestCard'));
const MediaLightbox = lazy(() => import('@/components/MediaLightbox'));
const PhotoEditor = lazy(() => import('@/components/PhotoEditor'));
const LiveHistory = lazy(() => import('@/components/live/LiveHistory'));
const DashboardPartnershipsSection = lazy(() => import('@/components/dashboard/DashboardPartnershipsSection'));
const DashboardAIMarketing = lazy(() => import('@/components/dashboard/DashboardAIMarketing'));

const CreatorBundlesSection = lazy(() => import('@/components/bundle/CreatorBundlesSection'));
const CreatorWishlistSection = lazy(() => import('@/components/wishlist/CreatorWishlistSection'));
const CreatorPollsSection = lazy(() => import('@/components/polls/CreatorPollsSection'));
const DashboardPaymentsSection = lazy(() => import('@/components/dashboard/DashboardPaymentsSection').then(m => ({ default: m.DashboardPaymentsSection })));
import { StoriesBar } from '@/components/stories/StoriesBar';

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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { useMyContent } = useContent();
  const { trackPageView } = useAnalytics();
  const { unreadCount } = useUnreadMessages();
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  
  // State
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'profile' | 'analytics' | 'payments' | 'pricing' | 'messages' | 'privacy'>('profile');
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
  const [creatorProfileLoading, setCreatorProfileLoading] = useState(true);
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
        setCreatorProfile(null);
        setCreatorProfileLoading(false);
        return;
      }

      setCreatorProfileLoading(true);
      try {
        const { data: creatorData, error: creatorError } = await supabase
          .rpc('get_my_creator_dashboard_profile')
          .maybeSingle();
        
        console.log('[Dashboard] checkIfCreator result:', { creatorData, creatorError, userId: user.id });
        
        if (creatorError) {
          console.error('[Dashboard] Creator query error:', creatorError);
        }
        
        if (creatorData?.id) {
          setIsCreatorLocal(true);
          setCreatorProfile(creatorData);
          setStripeConnected(creatorData.stripe_account_status === 'active' && creatorData.stripe_payouts_enabled);
        } else {
          setIsCreatorLocal(false);
          setCreatorProfile(null);
        }
      } catch (error) {
        console.error('Error checking creator status:', error);
        setIsCreatorLocal(false);
        setCreatorProfile(null);
      } finally {
        setCreatorProfileLoading(false);
      }
    };
    checkIfCreator();
  }, [user]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        if (creatorProfile?.stage_name) {
          const stageNameSlug = creatorProfile.stage_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          setShareLink(`${window.location.origin}/${stageNameSlug}`);
          setShareDisplayName(creatorProfile.stage_name);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData?.username) {
          setShareLink(`${window.location.origin}/${profileData.username}`);
          setShareDisplayName(profileData.username);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadUserProfile();
  }, [user, creatorProfile?.stage_name]);

  // Load creator stats — wrapped in useCallback to avoid stale closures
  const loadCreatorStats = React.useCallback(async () => {
    if (!user || isCreatorLocal !== true || !creatorProfile?.id) return;
    try {
      const { data: revenueData } = await supabase.rpc('calculate_creator_revenue_with_commission', {
        creator_uuid: creatorProfile.id,
        start_date: new Date(0).toISOString(),
        end_date: new Date().toISOString(),
      });
      
      const totalEarnings = revenueData?.[0]?.total_after_commission || 0;
      
      const { data: contentStats } = await supabase
        .from('content')
        .select('id, view_count, like_count')
        .eq('creator_id', creatorProfile.id);

      const totalViews = contentStats?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;
      const totalLikes = contentStats?.reduce((sum, content) => sum + (content.like_count || 0), 0) || 0;

      setCreatorStats({
        totalEarnings,
        totalSubscribers: creatorProfile.total_subscribers || 0,
        totalViews,
        totalLikes
      });
    } catch (error) {
      console.error('Error loading creator stats:', error);
    }
  }, [user, isCreatorLocal, creatorProfile?.id]);

  useEffect(() => {
    loadCreatorStats();
  }, [loadCreatorStats]);

  // Realtime subscriptions for stats - CONSOLIDATED into a single channel
  useEffect(() => {
    if (!user || isCreatorLocal !== true || !creatorProfile?.id) return;

    // Debounce timer for batching rapid events
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadCreatorStats(), 5000);
    };

    const statsChannel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'content_views' },
        () => setCreatorStats(prev => ({ ...prev, totalViews: prev.totalViews + 1 }))
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'content_likes' },
        () => setCreatorStats(prev => ({ ...prev, totalLikes: prev.totalLikes + 1 }))
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'content_likes' },
        () => setCreatorStats(prev => ({ ...prev, totalLikes: Math.max(0, prev.totalLikes - 1) }))
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions', filter: `creator_id=eq.${creatorProfile.id}` },
        () => debouncedRefresh()
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tips', filter: `creator_id=eq.${creatorProfile.id}` },
        (payload) => {
          const tipAmount = payload.new.amount || 0;
          setCreatorStats(prev => ({ ...prev, totalEarnings: prev.totalEarnings + tipAmount }));
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(statsChannel);
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

  // Loading state - wait for both auth AND creator profile to resolve
  if (loading || isCreatorLocal === null || creatorProfileLoading) {
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

  // Menu items — uniquement des outils déjà existants dans Fan Forge
  const menuItems = [
    { id: 'overview' as DashboardSection, label: t('dashboard.overview'), icon: Home, badge: 0 },
    { id: 'content' as DashboardSection, label: t('dashboard.myContent'), icon: ImageIcon, badge: 0 },
    { id: 'stories' as DashboardSection, label: 'Stories', icon: Camera, badge: 0 },
    { id: 'bundles' as DashboardSection, label: 'Bundles', icon: Package, badge: 0 },
    { id: 'polls' as DashboardSection, label: 'Sondages', icon: Vote, badge: 0 },
    { id: 'messages' as DashboardSection, label: t('dashboard.messages'), icon: MessageCircle, badge: unreadCount },
    { id: 'wishlists' as DashboardSection, label: 'Wishlist', icon: Gift, badge: 0 },
    { id: 'live' as DashboardSection, label: 'Studio Live', icon: Radio, badge: 0 },
    { id: 'private-lives' as DashboardSection, label: 'Lives privés', icon: Video, badge: 0 },
    { id: 'revenue' as DashboardSection, label: 'Revenus', icon: LineChart, badge: 0 },
    { id: 'payments' as DashboardSection, label: t('dashboard.payments'), icon: Banknote, badge: 0 },
    { id: 'partnerships' as DashboardSection, label: t('dashboard.partnerships'), icon: Handshake, badge: 0 },
    { id: 'ai-marketing' as DashboardSection, label: 'IA Marketing', icon: BrainCircuit, badge: 0 },
    { id: 'profile' as DashboardSection, label: 'Profil', icon: User, badge: 0 },
    { id: 'settings' as DashboardSection, label: t('dashboard.settings'), icon: Settings, badge: 0 },
  ];

  // Navigation: certaines fonctions vivent déjà sur une route dédiée
  const handleSectionChange = (section: DashboardSection) => {
    if (section === 'private-lives') {
      navigate('/live-calendar');
      return;
    }
    if (section === 'profile') setSettingsDefaultTab('profile');
    if (section === 'settings') setSettingsDefaultTab('privacy');
    setActiveSection(section);
    document.getElementById('dashboard-section-content')?.scrollIntoView({ block: 'start' });
  };

  return (
    <SidebarProvider defaultOpen>
    <div className="min-h-screen w-full bg-background pt-16">
      <div className="flex w-full min-h-[calc(100vh-64px)]">
        <DashboardSidebar
          menuItems={menuItems}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          stageName={shareDisplayName}
        />

        <SidebarInset className="min-w-0 flex-1 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 md:pb-16">

        {/* Header (sticky, contains sidebar trigger) */}
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
          <DashboardStripeAlert onConfigure={() => {
            setSettingsDefaultTab('payments');
            setActiveSection('settings');
            setTimeout(() => {
              document.getElementById('dashboard-section-content')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }} />
        )}

        {/* Section title strip */}
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/60 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Studio</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>
        </div>

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

        {/* Section content anchor for scroll */}
        <div id="dashboard-section-content" />

        {/* Section: Overview */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <StoriesBar forceCreatorId={creatorProfile?.id ?? null} />
            <DashboardStats stats={creatorStats} />
            <DashboardQuickActions 
              onNewContent={() => setShowUpload(true)}
              onSectionChange={handleSectionChange}
            />
            <DashboardRevenueChart creatorId={creatorProfile?.id} />
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-4">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight">{t('dashboard.liveStudio')}</h3>
                <p className="text-[12px] text-muted-foreground">{t('dashboard.broadcastForSubscribers')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/live-calendar')}
                className="h-8 gap-1.5 rounded-md text-[12px]"
              >
                <Video className="h-3.5 w-3.5" />
                {t('dashboard.privateLives')}
              </Button>
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

        {/* Section: Stories */}
        {activeSection === 'stories' && (
          <StoriesBar forceCreatorId={creatorProfile?.id ?? null} />
        )}

        {/* Section: Revenus (mêmes données que la carte Revenus) */}
        {activeSection === 'revenue' && (
          <div className="space-y-6">
            <DashboardStats stats={creatorStats} />
            <DashboardRevenueChart creatorId={creatorProfile?.id} />
          </div>
        )}

        {/* Section: Paiements */}
        {activeSection === 'payments' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPaymentsSection creatorId={creatorProfile.id} />
          </Suspense>
        )}


        {/* Section: Bundles */}
        {activeSection === 'bundles' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorBundlesSection creatorId={creatorProfile.id} />
          </Suspense>
        )}

        {/* Section: Wishlists */}
        {activeSection === 'wishlists' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorWishlistSection creatorId={creatorProfile.id} />
          </Suspense>
        )}

        {/* Section: Polls */}
        {activeSection === 'polls' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <CreatorPollsSection creatorId={creatorProfile.id} />
          </Suspense>
        )}

        {/* Section: Partnerships */}
        {activeSection === 'partnerships' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPartnershipsSection creatorId={creatorProfile.id} />
          </Suspense>
        )}

        {/* Section: AI Marketing */}
        {activeSection === 'ai-marketing' && creatorProfile?.id && (
          <Suspense fallback={<LoadingFallback message="Chargement de l'IA Marketing..." />}>
            <DashboardAIMarketing
              creatorId={creatorProfile.id}
              creatorStats={creatorStats}
              stageName={shareDisplayName}
            />
          </Suspense>
        )}

        {/* Section: Settings (includes Analytics, Payments, Pricing) */}
        {activeSection === 'settings' && (
          creatorProfileLoading ? (
            <LoadingFallback message="Chargement des paramètres..." />
          ) : creatorProfile?.id ? (
            <DashboardSettingsSection 
              stripeConnected={stripeConnected} 
              creatorId={creatorProfile.id}
              currentBoostUntil={creatorProfile.featured_until}
              defaultTab={settingsDefaultTab}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground">Impossible de charger votre profil créateur.</p>
              <p className="mt-1 text-sm text-muted-foreground">Rechargez la page si le problème persiste.</p>
            </div>
          )
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
        </SidebarInset>
      </div>
    </div>
    </SidebarProvider>
  );
};

export default Dashboard;
