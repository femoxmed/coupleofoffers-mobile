import { apiClient } from './apiClient';

export interface ServerNotification {
  id: string;
  recipient_type: 'user' | 'partner';
  type: string;
  title: string;
  message: string;
  metadata?: {
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
    try {
      const data = await apiClient<NotificationsResponse>('/api/v1/account/notifications');
      return data && Array.isArray(data.items) ? data : { unreadCount: 0, items: [] };
    } catch {
      return { unreadCount: 0, items: [] };
    }
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
