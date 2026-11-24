/**
 * Google Sign-In Hook — Couple Of Offers Mobile
 *
 * Uses expo-auth-session + expo-web-browser (already installed) to run the
 * Google OAuth flow and authenticate against the backend.
 *
 * ⚠️  REQUIRES:
 *   npm install expo-auth-session expo-crypto
 *   Then set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.
 *   Add your Expo scheme (coupleofoffers) to your Google OAuth redirect URIs.
 *
 * Usage:
 *   const { signInWithGoogle, loading } = useGoogleAuth();
 *   <TouchableOpacity onPress={signInWithGoogle} disabled={loading}>
 *     <Text>Sign in with Google</Text>
 *   </TouchableOpacity>
 */

import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../services/apiClient';
import { setAuthToken, setStoredUser } from '../services/apiClient';
import type { AuthUser } from '../services/authService';

// Lazy imports — avoids crashing if the package isn't installed yet
let AuthSession: any = null;
let Crypto: any = null;
let WebBrowser: any = null;

try {
  // @ts-ignore
  AuthSession = require('expo-auth-session');
  // @ts-ignore
  Crypto = require('expo-crypto');
  // @ts-ignore
  WebBrowser = require('expo-web-browser');
  // Complete any pending auth sessions on Android
  WebBrowser?.maybeCompleteAuthSession();
} catch {
  // expo-auth-session not installed
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

// ─────────────────────────────────────────────────────────────────────────────

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const { initAuth } = useAuthStore();

  const signInWithGoogle = async () => {
    if (!AuthSession || !Crypto || !WebBrowser) {
      Alert.alert(
        'Not Available',
        'Google Sign-In requires expo-auth-session. Run: npm install expo-auth-session expo-crypto',
      );
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      Alert.alert('Configuration Missing', 'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }

    setLoading(true);
    try {
      // PKCE code verifier
      const codeVerifier = AuthSession.generateHint
        ? AuthSession.generateHint(43)
        : (await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Math.random().toString(36),
          ));

      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'coupleofoffers' });

      const discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com',
      );

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'email', 'profile'],
        redirectUri,
        usePKCE: true,
        extraParams: { access_type: 'offline' },
      });

      const result = await request.promptAsync(discovery);

      if (result.type !== 'success' || !result.params?.code) {
        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          Alert.alert('Sign-in Failed', 'Google authentication was unsuccessful. Please try again.');
        }
        return;
      }

      // Exchange code for tokens on our backend
      const data = await apiClient<{
        token?: string;
        email: string;
        name?: string;
        role: string;
        is_partner?: boolean;
        is_admin?: boolean;
      }>('/api/v1/account/google', {
        method: 'POST',
        body: JSON.stringify({
          code: result.params.code,
          codeVerifier: request.codeVerifier,
          redirectUri,
          platform: Platform.OS,
        }),
      });

      const user: AuthUser = {
        email: data.email,
        name: data.name || data.email.split('@')[0],
        role: (data.role as any) || 'customer',
        is_partner: Boolean(data.is_partner),
        is_admin: Boolean(data.is_admin),
      };

      if (data.token) await setAuthToken(data.token);
      await setStoredUser(user);

      // Refresh auth state across the app
      await initAuth();
    } catch (err: any) {
      Alert.alert('Sign-in Error', err?.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = Boolean(AuthSession && GOOGLE_CLIENT_ID);

  return { signInWithGoogle, loading, isAvailable };
}
