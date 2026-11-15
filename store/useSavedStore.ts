import { create } from 'zustand';
import type { SavedOffer } from '../types';
import { catalogService } from '../services/catalog';

interface SavedState {
  savedOffers: SavedOffer[];
  savedIds: Set<string>;
  isLoading: boolean;
  fetchSaved: () => Promise<void>;
  toggleSave: (offer: SavedOffer) => Promise<void>;
  isSaved: (id: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedOffers: [],
  savedIds: new Set(),
  isLoading: false,

  fetchSaved: async () => {
    set({ isLoading: true });
    try {
      const offers = await catalogService.getSavedOffers();
      set({
        savedOffers: offers,
        savedIds: new Set(offers.map((o) => o.id)),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleSave: async (offer: SavedOffer) => {
    const { savedIds, savedOffers } = get();
    const currentlySaved = savedIds.has(offer.id);

    // Optimistic UI update
    const nextIds = new Set(savedIds);
    let nextOffers = [...savedOffers];

    if (currentlySaved) {
      nextIds.delete(offer.id);
      nextOffers = nextOffers.filter((o) => o.id !== offer.id);
    } else {
      nextIds.add(offer.id);
      nextOffers.push(offer);
    }

    set({ savedIds: nextIds, savedOffers: nextOffers });

    try {
      await catalogService.toggleSaveOffer(offer.id, !currentlySaved);
    } catch (err) {
      // Revert if API fails
      set({ savedIds, savedOffers });
      console.warn('Failed to toggle save on backend:', err);
    }
  },

  isSaved: (id: string) => get().savedIds.has(id),
}));
