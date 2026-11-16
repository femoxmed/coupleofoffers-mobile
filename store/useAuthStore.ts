import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { getAuthToken } from '../services/apiClient';
import { checkoutService } from '../services/checkoutService';
import { useSavedStore } from './useSavedStore';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (
    email: string,
    password: string,
    role?: 'customer' | 'restaurant',
    name?: string
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,

  initAuth: async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        set({ user: null, token: null, isInitialized: true });
        return;
      }

      const user = await authService.getMe();
      set({ user, token: user ? token : null, isInitialized: true });
      if (user?.email) {
        useSavedStore.getState().fetchSaved(user.email);
      }
    } catch {
      set({ user: null, token: null, isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await authService.login(email, password);
      const token = await getAuthToken();
      set({ user, token, isLoading: false });
      if (user?.email) {
        useSavedStore.getState().fetchSaved(user.email);
      }
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signup: async (
    email: string,
    password: string,
    role = 'customer',
    name?: string
  ) => {
    set({ isLoading: true });
    try {
      const user = await authService.signup(email, password, role, name);
      const token = await getAuthToken();
      set({ user, token, isLoading: false });
      if (user?.email) {
        useSavedStore.getState().fetchSaved(user.email);
      }
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const currentUser = get().user;
      await authService.logout();
      if (currentUser?.email) {
        await checkoutService.clearUserBookings(currentUser.email);
      }
      await useSavedStore.getState().clearSaved(currentUser?.email);
      set({ user: null, token: null, isLoading: false });
    } catch {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
