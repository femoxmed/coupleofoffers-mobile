import { apiClient } from './apiClient';
import { resolveImageUrl } from '../constants/config';
import type { Offer, Partner, HomepageSlide, SavedOffer, Slot } from '../types';

export type PartnerDetail = Partner & { packages: Offer[]; gallery: string[] };
type ApiSlot = Slot & { available?: number; booking_closes_at?: string };

export const catalogService = {
  async getOffers(): Promise<Offer[]> {
    const data = await apiClient<Offer[]>('/api/v1/offers');
    return data.map(offer => ({ ...offer, image_url: offer.image_url ? resolveImageUrl(offer.image_url) : null }));
  },

  async getOfferById(id: string): Promise<Offer & { slots: Slot[] }> {
    const data = await apiClient<Offer & { slots: ApiSlot[] }>(`/api/v1/offers/${encodeURIComponent(id)}`);
    return {
      ...data,
      image_url: data.image_url ? resolveImageUrl(data.image_url) : null,
      slots: (data.slots || []).map(slot => ({
        ...slot,
        cutoff_at: slot.booking_closes_at ?? slot.cutoff_at,
        remaining_units: slot.available ?? slot.remaining_units,
      })),
    };
  },

  async getPartners(): Promise<Partner[]> {
    const data = await apiClient<Partner[]>('/api/v1/partners');
    return data.map(partner => ({ ...partner, banner_url: partner.banner_url ? resolveImageUrl(partner.banner_url) : null }));
  },

  async getPartnerBySlug(slug: string): Promise<PartnerDetail> {
    const data = await apiClient<Omit<PartnerDetail, 'gallery'> & { gallery?: Array<string | { url: string }> }>(`/api/v1/partners/${encodeURIComponent(slug)}`);
    return {
      ...data,
      banner_url: data.banner_url ? resolveImageUrl(data.banner_url) : null,
      packages: (data.packages || []).map(offer => ({ ...offer, image_url: offer.image_url ? resolveImageUrl(offer.image_url) : null })),
      gallery: (data.gallery || []).map(photo => typeof photo === 'string' ? photo : photo.url).filter(Boolean),
    };
  },

  async getHomepageSlides(): Promise<HomepageSlide[]> {
    const data = await apiClient<HomepageSlide[]>('/api/v1/homepage-slides');
    return data.map(slide => ({
      ...slide,
      href: slide.href.startsWith('/explore') ? slide.href.replace('/explore', '/(tabs)/explore') : '/(tabs)/explore',
    }));
  },

  /**
   * Fetch saved offers
   */
  async getSavedOffers(): Promise<SavedOffer[]> {
    const data = await apiClient<SavedOffer[]>('/api/v1/account/saved');
    return data.map(offer => ({ ...offer, image_url: offer.image_url ? resolveImageUrl(offer.image_url) : null }));
  },

  async syncSavedOffers(offerIds: string[]): Promise<SavedOffer[]> {
    const data = await apiClient<SavedOffer[]>('/api/v1/account/saved/sync', {
      method: 'POST', body: JSON.stringify({ offerIds }),
    });
    return data.map(offer => ({ ...offer, image_url: offer.image_url ? resolveImageUrl(offer.image_url) : null }));
  },

  /**
   * Toggle save offer
   */
  async toggleSaveOffer(id: string, save: boolean): Promise<void> {
    await apiClient(`/api/v1/account/saved/${id}`, { method: save ? 'PUT' : 'DELETE' });
  },
};
