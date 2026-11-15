import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { getAuthToken } from '../services/apiClient';

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

export const useAuthStore = create<AuthState>((set) => ({
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
      set({ user, token, isInitialized: true });
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
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, token: null, isLoading: false });
    } catch {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
