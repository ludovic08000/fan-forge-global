/**
 * Point d'entrée de l'application
 * @version 2.1.0
 */
import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Initialiser Sentry pour le monitoring d'erreurs
// DSN hardcodé car les VITE_* ne sont pas toujours rechargées dans le preview
const sentryDsn = "https://73507cd4af60b43e0223b2923e254ac9@o4510748031844352.ingest.de.sentry.io/4510748042461264";

Sentry.init({
  dsn: sentryDsn,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% des transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% des sessions
  replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreur
  // Environment
  environment: import.meta.env.MODE,
  // Ignorer certaines erreurs courantes non critiques
  ignoreErrors: [
    'ResizeObserver loop',
    'Network request failed',
    'Load failed',
    'ChunkLoadError',
  ],
});
console.log('✅ Sentry initialized for error monitoring');

// Enregistrer le Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// Composant de fallback pour Sentry ErrorBoundary
function SentryFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Une erreur s'est produite</h1>
        <p className="text-muted-foreground">
          L'erreur a été signalée automatiquement. Veuillez rafraîchir la page.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Rafraîchir
        </button>
      </div>
    </div>
  );
}
