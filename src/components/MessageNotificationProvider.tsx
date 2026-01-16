import React from 'react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

/**
 * Composant qui initialise les notifications de messages
 * Doit être placé dans le contexte Auth
 */
export const MessageNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useMessageNotifications();
  return <>{children}</>;
};
