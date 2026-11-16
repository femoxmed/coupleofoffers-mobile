import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { SavedOffer } from '../types';
import { catalogService } from '../services/catalog';

function getStorageKey(email?: string | null): string {
  if (email && email.trim()) {
    return `coo_saved_offers_${email.trim().toLowerCase()}`;
  }
  return 'coo_saved_offers_guest';
}

async function getStoredSavedOffers(email?: string | null): Promise<SavedOffer[]> {
  try {
    const key = getStorageKey(email);
    let raw = await SecureStore.getItemAsync(key);
    // Fallback to legacy key if user key is empty
    if (!raw && !email) {
      raw = await SecureStore.getItemAsync('coo_saved_offers_local');
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function persistSavedOffers(offers: SavedOffer[], email?: string | null): Promise<void> {
  try {
    const key = getStorageKey(email);
    await SecureStore.setItemAsync(key, JSON.stringify(offers));
  } catch {
    // Ignore storage write error
  }
}

interface SavedState {
  savedOffers: SavedOffer[];
  savedIds: Set<string>;
  isLoading: boolean;
  currentUserEmail?: string | null;
  fetchSaved: (email?: string | null) => Promise<void>;
  toggleSave: (offer: SavedOffer, email?: string | null) => Promise<void>;
  clearSaved: (email?: string | null) => Promise<void>;
  isSaved: (id: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedOffers: [],
  savedIds: new Set(),
  isLoading: false,
  currentUserEmail: null,

  fetchSaved: async (email?: string | null) => {
    set({ isLoading: true, currentUserEmail: email || null });

    set({ savedOffers: [], savedIds: new Set() });
    try {
      let offers: SavedOffer[];
      if (email) {
        offers = await catalogService.getSavedOffers();
      } else {
        const stored = await getStoredSavedOffers();
        const ids = new Set(stored.map(offer => offer.id));
        offers = (await catalogService.getOffers()).filter(offer => ids.has(offer.id));
      }
      set({ savedOffers: offers, savedIds: new Set(offers.map(offer => offer.id)), isLoading: false });
      await persistSavedOffers(offers, email);
    } catch {
      set({ isLoading: false });
    }
  },

  toggleSave: async (offer: SavedOffer, email?: string | null) => {
    const activeEmail = email || get().currentUserEmail;
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

    // Immediately update UI and user-specific storage
    set({ savedIds: nextIds, savedOffers: nextOffers });
    await persistSavedOffers(nextOffers, activeEmail);

    // Sync with server endpoint: /api/v1/account/saved/:id
    try {
      await catalogService.toggleSaveOffer(offer.id, !currentlySaved);
    } catch {
      // Keep saved on device even if unauthenticated
    }
  },

  clearSaved: async (email?: string | null) => {
    const activeEmail = email || get().currentUserEmail;
    set({ savedOffers: [], savedIds: new Set(), isLoading: false, currentUserEmail: null });
    try {
      if (activeEmail) {
        await SecureStore.deleteItemAsync(`coo_saved_offers_${activeEmail.trim().toLowerCase()}`);
      }
      await SecureStore.deleteItemAsync('coo_saved_offers_local');
      await SecureStore.deleteItemAsync('coo_saved_offers_guest');
    } catch {
      // Ignore deletion errors
    }
  },

  isSaved: (id: string) => get().savedOffers.some((o) => o.id === id),
}));
