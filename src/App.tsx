/**
 * Composant principal de l'application
 * Configure tous les providers et le routing
 */

import React, { Suspense, lazy, useState, useEffect, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useContentProtection } from "@/hooks/useContentProtection";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import CookieConsent from "@/components/CookieConsent";
import { MessageNotificationProvider } from "@/components/MessageNotificationProvider";
import SplashScreen from "@/components/SplashScreen";
import SkipToContent from "@/components/SkipToContent";
import { preloadSession } from "@/hooks/useSessionPreload";

// Précharger la session dès le démarrage
preloadSession();


// Lazy loading des pages pour améliorer les performances
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
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const MyPayments = lazy(() => import("./pages/MyPayments"));
const Partnerships = lazy(() => import("./pages/Partnerships"));
const IdentityVerification = lazy(() => import("./pages/IdentityVerification"));
const LiveCalendar = lazy(() => import("./pages/LiveCalendar"));


// Composant de chargement optimisé avec skeleton
const PageLoader = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Chargement">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-hidden="true"></div>
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

// Configuration du client React Query avec mise en cache optimisée
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Garder les données en cache pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garder les données inactives pendant 10 minutes
      gcTime: 10 * 60 * 1000,
      // Réessayer 3 fois en cas d'échec
      retry: 3,
      // Ne pas réessayer sur les erreurs 404
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Composant interne qui utilise le hook de protection
 */
const AppRoutes = () => {
  useContentProtection(true);
  useAdaptiveLayout();

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
      {/* Suspense pour le lazy loading des pages */}
      <main id="main-content" className="flex-1">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          
          <Route path="/suspended" element={<Suspended />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/lives" element={<LiveStreams />} />
          <Route path="/live/:streamId" element={<WatchLive />} />
          <Route path="/creator/:userId" element={<CreatorProfile />} />
          <Route path="/content/:contentId" element={<ContentDetail />} />
          <Route path="/install" element={<Install />} />
          {/* Pages légales */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/legal" element={<LegalNotice />} />
          <Route path="/cookies" element={<CookiePolicy />} />
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
          {/* Redirection sécurisée de l'ancien chemin admin */}
          <Route path="/admin" element={<NotFound />} />
          {/* Route dynamique pour les profils créateurs - doit être en dernier */}
          <Route path="/:username" element={<CreatorPublicPage />} />
          {/* Route catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </main>
      <Footer />
    </>
  );
};

/**
 * Composant racine de l'application
 * Gère tous les providers et le routing avec lazy loading
 */
const App = () => {
  // Only show splash screen once per session
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('splash_shown');
    }
    return true;
  });

  const handleSplashComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('splash_shown', 'true');
    }
    setShowSplash(false);
  };

  // Show only splash screen until it completes
  if (showSplash) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SplashScreen onComplete={handleSplashComplete} />
      </ThemeProvider>
    );
  }

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
