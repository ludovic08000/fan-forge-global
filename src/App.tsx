/**
 * Composant principal de l'application
 * Configure tous les providers et le routing
 */

import React, { Suspense, lazy, memo, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useContentProtection } from "@/hooks/useContentProtection";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { useWebVitalsCollector } from "@/hooks/useWebVitalsCollector";
import CookieConsent from "@/components/CookieConsent";
import { MessageNotificationProvider } from "@/components/MessageNotificationProvider";
import SkipToContent from "@/components/SkipToContent";
import { preloadSession } from "@/hooks/useSessionPreload";

// Précharger la session dès le démarrage
preloadSession();

// Lazy loading des pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const CreatorPublicPage = lazy(() => import("./pages/CreatorPublicPage"));
const Search = lazy(() => import("./pages/Search"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const WatchLive = lazy(() => import("./pages/WatchLive"));
const LiveAnalytics = lazy(() => import("./pages/LiveAnalytics"));
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const MySubscriptions = lazy(() => import("./pages/MySubscriptions"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Suspended = lazy(() => import("./pages/Suspended"));
const PrivateChatPage = lazy(() => import("./pages/PrivateChatPage"));
const CreatorChatPage = lazy(() => import("./pages/CreatorChatPage"));
const ContentDetail = lazy(() => import("./pages/ContentDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const MyPayments = lazy(() => import("./pages/MyPayments"));
const Partnerships = lazy(() => import("./pages/Partnerships"));
const IdentityVerification = lazy(() => import("./pages/IdentityVerification"));
const LiveCalendar = lazy(() => import("./pages/LiveCalendar"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// Route prefetch map for hover-based prefetching
const routePrefetchMap: Record<string, () => Promise<any>> = {
  '/': () => import("./pages/Index"),
  '/login': () => import("./pages/Login"),
  '/signup': () => import("./pages/Signup"),
  '/dashboard': () => import("./pages/Dashboard"),
  '/search': () => import("./pages/Search"),
  '/lives': () => import("./pages/LiveStreams"),
  '/messages': () => import("./pages/Messages"),
  '/subscriptions': () => import("./pages/MySubscriptions"),
  '/profile': () => import("./pages/ProfileSettings"),
};

// Prefetch a route on hover/focus
const prefetchedRoutes = new Set<string>();
export const prefetchRoute = (path: string) => {
  const normalizedPath = '/' + path.replace(/^\//, '').split('/')[0];
  if (prefetchedRoutes.has(normalizedPath)) return;
  const loader = routePrefetchMap[normalizedPath];
  if (loader) {
    prefetchedRoutes.add(normalizedPath);
    loader();
  }
};

// Skeleton page loader - ultra-lightweight
const PageLoader = memo(() => (
  <div className="min-h-screen bg-background" role="status" aria-label="Chargement">
    <div className="container mx-auto px-4 pt-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-full max-w-md bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-square bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

// Configuration du client React Query - agressivement caché
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

/**
 * Composant interne qui utilise le hook de protection
 */
const AppRoutes = () => {
  useContentProtection(true);
  useAdaptiveLayout();
  useWebVitalsCollector();

  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const search = location.search || "";
    const hash = location.hash || "";
    const hasCode = search.includes("code=");
    const isRecovery = hash.includes("type=recovery");

    if ((hasCode || isRecovery) && location.pathname !== "/reset-password") {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);
  
  return (
    <>
      <SkipToContent />
      <Header />
      <PWAInstallPrompt />
      <main id="main-content" className="flex-1">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/suspended" element={<Suspended />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/lives" element={<LiveStreams />} />
          <Route path="/live/:streamId" element={<WatchLive />} />
          <Route path="/creator/:userId" element={<CreatorProfile />} />
          <Route path="/content/:contentId" element={<ContentDetail />} />
          <Route path="/install" element={<Install />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/legal" element={<LegalNotice />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/security" element={
            <ProtectedRoute>
              <SecuritySettings />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          <Route path="/subscriptions" element={
            <ProtectedRoute>
              <MySubscriptions />
            </ProtectedRoute>
          } />
          <Route path="/my-payments" element={
            <ProtectedRoute>
              <MyPayments />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/messagerie/:creatorId" element={
            <ProtectedRoute>
              <PrivateChatPage />
            </ProtectedRoute>
          } />
          <Route path="/chat/:subscriberId" element={
            <ProtectedRoute>
              <CreatorChatPage />
            </ProtectedRoute>
          } />
          <Route path="/identity-verification" element={
            <ProtectedRoute>
              <IdentityVerification />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/partnerships" element={
            <ProtectedRoute>
              <Partnerships />
            </ProtectedRoute>
          } />
          <Route path="/live-analytics/:liveStreamId" element={
            <ProtectedRoute>
              <LiveAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/live-calendar" element={
            <ProtectedRoute>
              <LiveCalendar />
            </ProtectedRoute>
          } />
          <Route path="/backstage" element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<NotFound />} />
          <Route path="/:username" element={<CreatorPublicPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </main>
      <Footer />
    </>
  );
};

/**
 * Composant racine - rendu instantané, pas de splash screen bloquant
 */
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <MessageNotificationProvider>
            <TranslationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                  <CookieConsent />
                </BrowserRouter>
              </TooltipProvider>
            </TranslationProvider>
          </MessageNotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;