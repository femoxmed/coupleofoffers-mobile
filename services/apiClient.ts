import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';

const AUTH_TOKEN_KEY = 'coo_auth_token';
const AUTH_USER_KEY = 'coo_auth_user';

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
  } catch (error) {
    console.error('Failed to remove auth token:', error);
  }
}

export async function getStoredUser<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user:', error);
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 10000, headers = {}, ...fetchOptions } = options;

  const url = path.startsWith('http') ? path : `${Config.API_BASE_URL}${path}`;
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-coo-account': '1',
    ...(token ? { Authorization: `Bearer ${token}`, Cookie: `coo_account=${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      let parsedMessage = errorBody;
      try {
        const json = JSON.parse(errorBody);
        parsedMessage = json.message || errorBody;
      } catch {
        // use raw errorBody
      }
      throw new Error(parsedMessage || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
