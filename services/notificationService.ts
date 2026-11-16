import { apiClient } from './apiClient';

export interface ServerNotification {
  id: string;
  recipient_type: 'user' | 'partner';
  type: string;
  title: string;
  message: string;
  metadata?: {
    action?: string;
    reference?: string;
    venueName?: string;
    title?: string;
    arrivalPin?: string;
    partySize?: number;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
  booking_reference?: string | null;
}

export interface NotificationsResponse {
  unreadCount: number;
  items: ServerNotification[];
}

export const notificationService = {
  /**
   * Fetch authenticated user's notifications stored on the server
   */
  async getNotifications(): Promise<NotificationsResponse> {
    return apiClient<NotificationsResponse>('/api/v1/account/notifications');
  },

  /**
   * Mark a specific notification as read on the server
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      await apiClient(`/api/v1/account/notifications/${id}/read`, { method: 'PATCH' });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Mark all notifications as read on the server
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient('/api/v1/account/notifications/read-all', { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  },
};

export function notificationDestination(item: ServerNotification): '/(tabs)/explore' | '/(tabs)/profile' | '/(tabs)/bookings?tab=unpaid' | '/(tabs)/bookings?help=1' | '/(tabs)/bookings' {
  if (item.type === 'account_welcome' || item.type === 'saved_offer_update') return '/(tabs)/explore';
  if (item.type === 'security_alert') return '/(tabs)/profile';
  if (item.type.startsWith('support_')) return '/(tabs)/bookings?help=1';
  if (item.type === 'payment_pending' || item.type === 'payment_expiring') return '/(tabs)/bookings?tab=unpaid';
  return '/(tabs)/bookings';
}
