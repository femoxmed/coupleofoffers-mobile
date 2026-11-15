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

    // 1. First load from user-isolated device SecureStore
    const local = await getStoredSavedOffers(email);
    const current = get().savedOffers;
    const mergedInitial = new Map<string, SavedOffer>();
    local.forEach((o) => mergedInitial.set(o.id, o));
    current.forEach((o) => mergedInitial.set(o.id, o));
    const combinedInitial = Array.from(mergedInitial.values());

    set({
      savedOffers: combinedInitial,
      savedIds: new Set(combinedInitial.map((o) => o.id)),
    });

    // 2. Sync with the server API (only if authenticated user)
    try {
      const serverOffers = await catalogService.getSavedOffers();
      if (Array.isArray(serverOffers)) {
        const mergedMap = new Map<string, SavedOffer>();
        // Prefer server state for authenticated accounts
        serverOffers.forEach((o) => mergedMap.set(o.id, o));
        // Keep any local unpersisted
        local.forEach((o) => {
          if (!mergedMap.has(o.id)) mergedMap.set(o.id, o);
        });

        const combined = Array.from(mergedMap.values());
        set({
          savedOffers: combined,
          savedIds: new Set(combined.map((o) => o.id)),
          isLoading: false,
        });
        await persistSavedOffers(combined, email);
      } else {
        set({ isLoading: false });
      }
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
