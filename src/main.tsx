/**
 * Point d'entrée de l'application
 * @version 2.0.1
 */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Enregistrer le Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Nouvelle version disponible
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
