import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { SavedOffer } from '../types';
import { catalogService } from '../services/catalog';

const SAVED_STORAGE_KEY = 'coo_saved_offers_local';

async function getStoredSavedOffers(): Promise<SavedOffer[]> {
  try {
    const raw = await SecureStore.getItemAsync(SAVED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function persistSavedOffers(offers: SavedOffer[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(SAVED_STORAGE_KEY, JSON.stringify(offers));
  } catch {
    // Ignore storage write error
  }
}

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
    // First load from device SecureStore so state is instantaneous
    const local = await getStoredSavedOffers();
    if (local.length > 0 && get().savedOffers.length === 0) {
      set({
        savedOffers: local,
        savedIds: new Set(local.map((o) => o.id)),
      });
    }

    try {
      const serverOffers = await catalogService.getSavedOffers();
      if (Array.isArray(serverOffers) && serverOffers.length > 0) {
        // Merge server offers with local offers
        const mergedMap = new Map<string, SavedOffer>();
        local.forEach((o) => mergedMap.set(o.id, o));
        serverOffers.forEach((o) => mergedMap.set(o.id, o));
        const combined = Array.from(mergedMap.values());

        set({
          savedOffers: combined,
          savedIds: new Set(combined.map((o) => o.id)),
          isLoading: false,
        });
        await persistSavedOffers(combined);
      } else {
        set({ isLoading: false });
      }
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
      nextOffers = [offer, ...nextOffers];
    }

    // Immediately update UI and device storage
    set({ savedIds: nextIds, savedOffers: nextOffers });
    await persistSavedOffers(nextOffers);

    // Sync with backend (without reverting local wishlist on error)
    try {
      await catalogService.toggleSaveOffer(offer.id, !currentlySaved);
    } catch {
      // Keep saved on device even if unauthenticated / offline
    }
  },

  isSaved: (id: string) => get().savedIds.has(id),
}));
