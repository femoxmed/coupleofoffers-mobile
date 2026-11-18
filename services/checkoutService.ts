import * as SecureStore from 'expo-secure-store';
import { apiClient } from './apiClient';

export interface CheckoutInitParams {
  offerId: string;
  slotId?: string;
  partySize: number;
  totalKobo: number;
  email: string;
  offerTitle?: string;
  venueName?: string;
  venueAddress?: string;
  slotTime?: string;
  payerEmail?: string;
  payerName?: string;
  payeeName?: string;
  beneficiaryPhone?: string;
}

export interface CheckoutInitResponse {
  authorizationUrl: string;
  reference: string;
  checkoutId?: string;
}

export interface ConfirmedBooking {
  id: string;
  reference: string;
  offerId: string;
  offerTitle: string;
  venueName: string;
  venueAddress?: string;
  partySize: number;
  amountKobo: number;
  email: string;
  slotTime?: string;
  startsAt?: string;
  arrivalPin: string;
  createdAt: string;
  status:
    | 'confirmed'
    | 'pending'
    | 'completed'
    | 'refund_pending'
    | 'refund_submitted'
    | 'review'
    | 'cancelled';
  checkoutExpiresAt?: string;
  canResume?: boolean;
  refundReason?: string;
  refundEligibleAuto?: boolean;
  payerEmail?: string | null;
  payerName?: string | null;
  payeeName?: string | null;
}

export interface RescheduleSlotItem {
  id: string;
  starts_at: string;
  cutoff_at?: string;
  available: number;
  capacity?: number;
}

const BOOKINGS_STORAGE_PREFIX = 'coo_mobile_bookings_';
function getUserStorageKey(email?: string | null): string {
  if (!email || !email.trim()) return 'coo_mobile_bookings_guest';
  const clean = email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${BOOKINGS_STORAGE_PREFIX}${clean}`;
}

export const checkoutService = {
  /** Start checkout through the API, which validates price and reserves real inventory. */
  async initBachsCheckout(params: CheckoutInitParams): Promise<CheckoutInitResponse> {
    if (!params.offerId || !params.slotId || !params.email || !Number.isInteger(params.totalKobo) || params.totalKobo <= 0) {
      throw new Error('Choose a valid offer, arrival time and email before checkout.');
    }
    await apiClient('/api/v1/offers/session', { method: 'POST', body: '{}' });
    const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 3) | 8).toString(16);
    });
    const data = await apiClient<CheckoutInitResponse>(`/api/v1/offers/${params.offerId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ requestId, slotId: params.slotId, partySize: params.partySize, expectedTotalKobo: params.totalKobo, email: params.email, payerEmail: params.payerEmail, payerName: params.payerName, payeeName: params.payeeName, beneficiaryPhone: params.beneficiaryPhone }),
    });
    return data;
  },

  async resumeBooking(reference: string): Promise<{ reference: string; authorizationUrl?: string; status?: string }> {
    return apiClient(`/api/v1/account/bookings/${reference}/resume`, { method: 'POST', body: '{}' });
  },

  async verifyBooking(reference: string): Promise<{ status: string; arrivalCode?: string | null }> {
    return apiClient(`/api/v1/offers/bookings/${encodeURIComponent(reference)}`);
  },

  /**
   * Clear all bookings stored on device for a user (called on logout)
   */
  async clearUserBookings(userEmail?: string | null): Promise<void> {
    try {
      const storageKey = getUserStorageKey(userEmail);
      await SecureStore.deleteItemAsync(storageKey);
      // Clean up legacy global key if present to prevent leaks
      await SecureStore.deleteItemAsync('coo_mobile_confirmed_bookings');
    } catch {}
  },

  /**
   * Get all user bookings: strictly isolated per user so data never leaks to other users
   */
  async getBookings(currentUserEmail?: string | null): Promise<ConfirmedBooking[]> {
    const normUserEmail = currentUserEmail ? currentUserEmail.trim().toLowerCase() : null;

    try {
      // Attempt to fetch from server if authenticated
      const serverItems = await apiClient<any[]>('/api/v1/account/bookings', { timeoutMs: 3500 });
      if (Array.isArray(serverItems)) {
        // The API already scopes results to the authenticated account as guest or payer.
        // Do not filter by guest_email here: gift bookings belong to the payer too.
        const filteredServer = serverItems;

        const mappedServer: ConfirmedBooking[] = filteredServer.map((item) => {
          let slotFormatted = 'Reserved Slot';
          if (item.starts_at) {
            const d = new Date(item.starts_at);
            slotFormatted = `${d.toLocaleDateString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}, ${d.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}`;
          }
          return {
            id: item.reference,
            reference: item.reference,
            offerId: item.offer_id || '',
            offerTitle: item.title || 'Curated Experience',
            venueName: item.venue_name || 'Curated Venue',
            venueAddress: item.venue_address,
            partySize: Number(item.party_size),
            amountKobo: Number(item.price_kobo),
            email: item.guest_email || normUserEmail || '',
            slotTime: slotFormatted,
            startsAt: item.starts_at,
            arrivalPin: item.arrival_code || '',
            createdAt: item.created_at || item.confirmed_at || '',
            checkoutExpiresAt: item.checkout_expires_at,
            canResume: item.can_resume,
            status: item.status || 'pending',
            refundReason: item.review_reason,
            payerEmail: item.payer_email || null,
            payerName: item.payer_name || null,
            payeeName: item.payee_name || null,
          };
        });

        return mappedServer;
      }
      throw new Error('Invalid bookings response.');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch available alternative slots for rescheduling
   */
  async getRescheduleSlots(reference: string): Promise<RescheduleSlotItem[]> {
    const data = await apiClient<{ slots: RescheduleSlotItem[] }>(
      `/api/v1/account/bookings/${reference}/reschedule-slots`
    );
    return (data.slots || []).filter(slot => slot.available > 0);
  },

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(
    reference: string,
    slotId: string,
    slotFormatted: string,
    startsAtIso: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient<{ message?: string }>(`/api/v1/account/bookings/${reference}/reschedule`, {
      method: 'POST', body: JSON.stringify({ slotId, reason }),
    });
    return { success: true, message: res.message || `Reservation rescheduled to ${slotFormatted}.` };
  },

  /**
   * Submit cancellation and refund request
   */
  async requestRefund(
    reference: string,
    reason: string,
    action: 'refund' | 'credit' = 'refund'
  ): Promise<{ success: boolean; message: string; eligibleAuto: boolean; status: string }> {
    const res = await apiClient<{ status: string; eligibleAuto: boolean; message: string }>(
      `/api/v1/account/bookings/${reference}/refund`, {
        method: 'POST', body: JSON.stringify({ reason, action }),
      }
    );
    return { success: true, ...res };
  },

  /**
   * Submit support / concierge ticket
   */
  async submitSupportTicket(payload: {
    name: string;
    email: string;
    topic: string;
    bookingReference?: string;
    message: string;
  }): Promise<{ success: boolean; ticketNumber: string; message: string }> {
    const res = await apiClient<{ ticket_number: string; message?: string }>('/api/v1/support', {
      method: 'POST',
      body: JSON.stringify({ name: payload.name.trim(), email: payload.email.trim(), topic: payload.topic, booking_reference: payload.bookingReference?.trim(), message: payload.message.trim() }),
    });
    return { success: true, ticketNumber: res.ticket_number, message: res.message || 'Support ticket received by concierge.' };
  },
};
