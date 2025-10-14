/**
 * Système de tracking et d'analytics pour l'application
 * Permet de suivre les événements utilisateurs et les métriques de performance
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Types d'événements trackables dans l'application
 */
export enum AnalyticsEvent {
  // Événements d'authentification
  SIGN_UP = 'sign_up',
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  
  // Événements de contenu
  CONTENT_VIEW = 'content_view',
  CONTENT_LIKE = 'content_like',
  CONTENT_SHARE = 'content_share',
  CONTENT_UPLOAD = 'content_upload',
  
  // Événements d'abonnement
  SUBSCRIPTION_START = 'subscription_start',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  SUBSCRIPTION_RENEW = 'subscription_renew',
  
  // Événements de recherche
  SEARCH_PERFORMED = 'search_performed',
  CREATOR_PROFILE_VIEW = 'creator_profile_view',
  
  // Événements financiers
  TIP_SENT = 'tip_sent',
  PAYMENT_COMPLETED = 'payment_completed',
  
  // Événements d'engagement
  MESSAGE_SENT = 'message_sent',
  PROFILE_UPDATED = 'profile_updated',
  
  // Événements d'erreur
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  
  // Événements live
  LIVE_STARTED = 'live_started',
  LIVE_JOINED = 'live_joined',
  LIVE_ERROR = 'live_error',
}

/**
 * Interface pour les propriétés d'événement
 */
interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Interface pour les métriques de performance
 */
interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoadedTime: number;
  resourceLoadTime: number;
  memoryUsage?: number;
}

/**
 * Classe principale du système d'analytics
 */
class Analytics {
  private userId: string | null = null;
  private sessionId: string;
  private startTime: number;

  constructor() {
    // Générer un ID de session unique
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    
    // Initialiser le tracking des performances
    this.initPerformanceTracking();
  }

  /**
   * Définir l'utilisateur courant pour le tracking
   * @param userId - L'identifiant de l'utilisateur
   */
  setUser(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Envoyer un événement au système d'analytics
   * @param event - Le type d'événement
   * @param properties - Les propriétés additionnelles de l'événement
   */
  async track(event: AnalyticsEvent, properties?: EventProperties) {
    try {
      const eventData = {
        event_type: event,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          // Ajouter des métadonnées automatiques
          page_url: window.location.href,
          page_title: document.title,
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        },
      };

      // En développement, logger dans la console
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Analytics Event:', eventData);
      }

      // TODO: Envoyer vers un service d'analytics ou stocker dans Supabase
      // await this.sendToAnalyticsService(eventData);
      
    } catch (error) {
      console.error('Erreur lors du tracking d\'événement:', error);
    }
  }

  /**
   * Tracker une vue de page
   * @param pageName - Le nom de la page
   * @param properties - Propriétés additionnelles
   */
  async trackPageView(pageName: string, properties?: EventProperties) {
    await this.track(AnalyticsEvent.CONTENT_VIEW, {
      page_name: pageName,
      ...properties,
    });
  }

  /**
   * Tracker un clic sur un élément
   * @param elementName - Le nom de l'élément cliqué
   * @param properties - Propriétés additionnelles
   */
  async trackClick(elementName: string, properties?: EventProperties) {
    await this.track(AnalyticsEvent.CONTENT_VIEW, {
      element_name: elementName,
      ...properties,
    });
  }

  /**
   * Initialiser le tracking des performances
   */
  private initPerformanceTracking() {
    // Attendre que la page soit complètement chargée
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = this.getPerformanceMetrics();
        this.trackPerformance(metrics);
      }, 0);
    });
  }

  /**
   * Obtenir les métriques de performance de la page
   * @returns Les métriques de performance
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: PerformanceMetrics = {
      pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      resourceLoadTime: navigation.responseEnd - navigation.requestStart,
    };

    // Ajouter l'utilisation mémoire si disponible
    if ((performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return metrics;
  }

  /**
   * Tracker les métriques de performance
   * @param metrics - Les métriques à tracker
   */
  private async trackPerformance(metrics: PerformanceMetrics) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚡ Performance Metrics:', metrics);
      }

      // TODO: Envoyer vers un service de monitoring
    } catch (error) {
      console.error('Erreur lors du tracking des performances:', error);
    }
  }

  /**
   * Obtenir des statistiques pour le dashboard créateur
   * @param creatorId - L'identifiant du créateur
   * @returns Les statistiques du créateur
   */
  async getCreatorAnalytics(creatorId: string) {
    try {
      // Récupérer les vues de contenu des 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contentViews, error: viewsError } = await supabase
        .from('content_views')
        .select('*, content:content_id(*)')
        .eq('content.creator_id', creatorId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (viewsError) throw viewsError;

      // Récupérer les likes des 30 derniers jours
      const { data: contentLikes, error: likesError } = await supabase
        .from('content_likes')
        .select('*, content:content_id(*)')
        .eq('content.creator_id', creatorId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (likesError) throw likesError;

      // Calculer les statistiques
      const viewsByDay = this.groupByDay(contentViews || []);
      const likesByDay = this.groupByDay(contentLikes || []);

      return {
        totalViews: contentViews?.length || 0,
        totalLikes: contentLikes?.length || 0,
        viewsByDay,
        likesByDay,
        averageViewDuration: this.calculateAverageViewDuration(contentViews || []),
        topContent: this.getTopContent(contentViews || []),
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      return null;
    }
  }

  /**
   * Grouper les données par jour
   * @param data - Les données à grouper
   * @returns Les données groupées par jour
   */
  private groupByDay(data: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    data.forEach((item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Calculer la durée moyenne de visionnage
   * @param views - Les vues de contenu
   * @returns La durée moyenne en secondes
   */
  private calculateAverageViewDuration(views: any[]): number {
    if (views.length === 0) return 0;
    
    const totalDuration = views.reduce((sum, view) => {
      return sum + (view.view_duration || 0);
    }, 0);

    return Math.round(totalDuration / views.length);
  }

  /**
   * Obtenir le contenu le plus populaire
   * @param views - Les vues de contenu
   * @returns Le top 5 des contenus
   */
  private getTopContent(views: any[]): any[] {
    const contentCounts: Record<string, number> = {};
    
    views.forEach((view) => {
      const contentId = view.content_id;
      contentCounts[contentId] = (contentCounts[contentId] || 0) + 1;
    });

    return Object.entries(contentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([contentId, count]) => ({ contentId, views: count }));
  }

  /**
   * Obtenir la durée de session actuelle
   * @returns La durée en millisecondes
   */
  getSessionDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Tracker une erreur avec contexte complet
   * @param error - L'erreur à tracker
   * @param context - Contexte additionnel
   */
  async trackError(error: Error | unknown, context?: EventProperties) {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
    };

    await this.track(AnalyticsEvent.ERROR_OCCURRED, {
      ...errorData,
      ...context,
    });

    // Logger dans la console en développement
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error tracked:', errorData, context);
    }
  }

  /**
   * Tracker une erreur API
   * @param endpoint - L'endpoint de l'API
   * @param status - Le code de statut HTTP
   * @param error - L'erreur
   */
  async trackApiError(endpoint: string, status: number, error: Error | unknown) {
    await this.track(AnalyticsEvent.API_ERROR, {
      endpoint,
      status,
      error_message: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Tracker une erreur réseau
   * @param url - L'URL de la requête
   * @param error - L'erreur
   */
  async trackNetworkError(url: string, error: Error | unknown) {
    await this.track(AnalyticsEvent.NETWORK_ERROR, {
      url,
      error_message: error instanceof Error ? error.message : String(error),
      is_offline: !navigator.onLine,
    });
  }
}

// Instance singleton du système d'analytics
export const analytics = new Analytics();

// Hook React pour faciliter l'utilisation
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackClick: analytics.trackClick.bind(analytics),
    setUser: analytics.setUser.bind(analytics),
    getCreatorAnalytics: analytics.getCreatorAnalytics.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackApiError: analytics.trackApiError.bind(analytics),
    trackNetworkError: analytics.trackNetworkError.bind(analytics),
  };
};
