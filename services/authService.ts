import {
  apiClient,
  setAuthToken,
  removeAuthToken,
  setStoredUser,
  getAuthToken,
} from './apiClient';

export interface AuthUser {
  email: string;
  name?: string;
  role: 'customer' | 'restaurant' | 'partner' | 'admin';
  is_partner?: boolean;
  is_admin?: boolean;
}

export interface AuthResponse {
  token?: string;
  email: string;
  role: 'customer' | 'restaurant' | 'partner' | 'admin';
  is_partner?: boolean;
  is_admin?: boolean;
}

export const authService = {
  /**
   * Sign in an existing member
   */
  async login(email: string, password: string): Promise<AuthUser> {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const data = await apiClient<AuthResponse>('/api/v1/account/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const user: AuthUser = {
        email: data.email || trimmedEmail,
        name: trimmedEmail.split('@')[0],
        role: data.role || 'customer',
        is_partner: Boolean(data.is_partner),
        is_admin: Boolean(data.is_admin),
      };

      if (data.token) {
        await setAuthToken(data.token);
      }
      await setStoredUser(user);

      return user;
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Register a new member account
   */
  async signup(
    email: string,
    password: string,
    role: 'customer' | 'restaurant' = 'customer',
    name?: string
  ): Promise<AuthUser> {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const data = await apiClient<AuthResponse>('/api/v1/account/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          role,
        }),
      });

      const user: AuthUser = {
        email: data.email || trimmedEmail,
        name: name?.trim() || trimmedEmail.split('@')[0],
        role: data.role || role,
        is_partner: Boolean(data.is_partner || role === 'restaurant'),
        is_admin: Boolean(data.is_admin),
      };

      if (data.token) {
        await setAuthToken(data.token);
      }
      await setStoredUser(user);

      return user;
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Sign out current member
   */
  async logout(): Promise<void> {
    try {
      await apiClient('/api/v1/account/signout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore network errors on signout
    } finally {
      await removeAuthToken();
    }
  },

  /**
   * Get currently authenticated user details
   */
  async getMe(): Promise<AuthUser | null> {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      const data = await apiClient<{
        email: string | null;
        role: string | null;
        is_partner: boolean;
        is_admin: boolean;
      }>('/api/v1/account');

      if (!data?.email) {
        await removeAuthToken();
        return null;
      }

      const user: AuthUser = {
        email: data.email,
        name: data.email.split('@')[0],
        role: (data.role as any) || 'customer',
        is_partner: data.is_partner,
        is_admin: data.is_admin,
      };

      await setStoredUser(user);
      return user;
    } catch {
      return null;
    }
  },
};
