/**
 * Composant principal de l'application
 * Configure tous les providers et le routing
 */

import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
// import { HelmetProvider } from "react-helmet-async"; // Désactivé temporairement
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useContentProtection } from "@/hooks/useContentProtection";


// Lazy loading des pages pour améliorer les performances
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
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

// Composant de chargement pour le Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

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
  // Activer la protection anti-capture globalement
  useContentProtection(true);

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
      <Header />
      <PWAInstallPrompt />
      {/* Suspense pour le lazy loading des pages */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/lives" element={<LiveStreams />} />
          <Route path="/live/:streamId" element={<WatchLive />} />
          <Route path="/creator/:userId" element={<CreatorProfile />} />
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
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/live-analytics/:liveStreamId" element={
            <ProtectedRoute>
              <LiveAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          {/* Route dynamique pour les profils créateurs - doit être en dernier */}
          <Route path="/:username" element={<CreatorPublicPage />} />
          {/* Route catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  );
};

/**
 * Composant racine de l'application
 * Gère tous les providers et le routing avec lazy loading
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <TranslationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </TranslationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
