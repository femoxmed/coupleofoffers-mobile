import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedOffer } from '../types';
import { catalogService } from '../services/catalog';

const GUEST_KEY = 'coo_saved_offers_guest';
const userKey = (email: string) => `coo_saved_offers_${email.trim().toLowerCase()}`;
let generation = 0;
let edits = 0;
let queue: Promise<void> = Promise.resolve();
let loadingFor: string | null | undefined;
let loading: Promise<void> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
function enqueue(work: () => Promise<void>) {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}
async function readGuest(): Promise<SavedOffer[]> {
  try {
    let raw = await AsyncStorage.getItem(GUEST_KEY);
    if (!raw) {
      raw = await SecureStore.getItemAsync(GUEST_KEY);
      if (raw) {
        await AsyncStorage.setItem(GUEST_KEY, raw);
        await SecureStore.deleteItemAsync(GUEST_KEY);
      }
    }
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}
interface SavedState {
  savedOffers: SavedOffer[];
  savedIds: Set<string>;
  isLoading: boolean;
  currentUserEmail: string | null;
  fetchSaved: (email?: string | null) => Promise<void>;
  toggleSave: (offer: SavedOffer, email?: string | null) => Promise<void>;
  clearSaved: (email?: string | null) => Promise<void>;
  isSaved: (id: string) => boolean;
}
export const useSavedStore = create<SavedState>((set, get) => {
  const show = (offers: SavedOffer[]) => set({ savedOffers: offers, savedIds: new Set(offers.map(offer => offer.id)) });
  return {
    savedOffers: [], savedIds: new Set(), isLoading: false, currentUserEmail: null,
    fetchSaved: (email) => {
      const identity = email?.trim().toLowerCase() || null;
      if (retryTimer) clearTimeout(retryTimer);
      if (loading && loadingFor === identity) return loading;
      if (get().currentUserEmail !== identity) {
        generation++;
        show([]);
      }
      const version = generation;
      const edit = edits;
      set({ currentUserEmail: identity, isLoading: true });
      loadingFor = identity;
      const task = enqueue(async () => {
        if (version !== generation) return;
        const guest = await readGuest();
        if (version !== generation) return;
        if (!identity) {
          if (edit === edits) show(guest);
          return;
        }
        let offers = await catalogService.getSavedOffers();
        const existing = new Set(offers.map(offer => offer.id));
        const missing = guest.filter(offer => !existing.has(offer.id)).map(offer => offer.id);
        for (let i = 0; i < missing.length; i += 200) {
          if (version !== generation) return;
          offers = await catalogService.syncSavedOffers(missing.slice(i, i + 200));
        }
        if (version !== generation) return;
        await Promise.allSettled([AsyncStorage.removeItem(GUEST_KEY), SecureStore.deleteItemAsync(GUEST_KEY), SecureStore.deleteItemAsync('coo_saved_offers_local')]);
        if (version === generation && edit === edits) show(offers);
      }).catch(() => {
        // Keep guest items and retry in the background while this account remains active.
        if (identity && version === generation) retryTimer = setTimeout(() => {
          if (version === generation) void get().fetchSaved(identity);
        }, 30_000);
      }).finally(() => {
        if (version === generation) set({ isLoading: false });
        if (loading === task) { loading = undefined; loadingFor = undefined; }
      });
      loading = task;
      return task;
    },
    toggleSave: async (offer) => {
      const version = generation;
      const identity = get().currentUserEmail;
      const wasSaved = get().savedIds.has(offer.id);
      edits++;
      show(wasSaved ? get().savedOffers.filter(item => item.id !== offer.id) : [offer, ...get().savedOffers]);
      await enqueue(async () => {
        if (version !== generation) return;
        if (!identity) {
          await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(get().savedOffers));
          return;
        }
        try {
          await catalogService.toggleSaveOffer(offer.id, !wasSaved);
          const offers = await catalogService.getSavedOffers();
          if (version === generation) show(offers);
        } catch {
          if (version === generation) show(wasSaved ? [offer, ...get().savedOffers.filter(item => item.id !== offer.id)] : get().savedOffers.filter(item => item.id !== offer.id));
        }
      });
    },
    clearSaved: async (email) => {
      const identity = email || get().currentUserEmail;
      generation++;
      if (retryTimer) clearTimeout(retryTimer);
      edits++;
      loading = undefined;
      loadingFor = undefined;
      set({ savedOffers: [], savedIds: new Set(), isLoading: false, currentUserEmail: null });
      await enqueue(async () => {
        const keys = [GUEST_KEY, 'coo_saved_offers_local', ...(identity ? [userKey(identity)] : [])];
        await Promise.allSettled([AsyncStorage.removeItem(GUEST_KEY), ...keys.map(key => SecureStore.deleteItemAsync(key))]);
      });
    },
    isSaved: id => get().savedIds.has(id),
  };
});
