/**
 * Push Notification Hook — Couple Of Offers Mobile
 *
 * Registers the device for Expo/FCM push notifications and syncs the token
 * with the backend (/api/v1/notifications/devices).
 *
 * ⚠️  REQUIRES: npm install expo-notifications expo-device
 *     Then rebuild the native app (expo run:ios / expo run:android)
 *
 * Usage: Call usePushNotifications() once in app/_layout.tsx after initAuth.
 */

import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../services/apiClient';

// Lazy imports — avoids crashing if the package isn't installed yet
let Notifications: any = null;
let Device: any = null;

try {
  // @ts-ignore
  Notifications = require('expo-notifications');
  // @ts-ignore
  Device = require('expo-device');
} catch {
  // expo-notifications not installed — push will be silently skipped
}

// ─────────────────────────────────────────────────────────────────────────────

async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;

  // Physical device required (simulators can't receive push)
  if (!Device.isDevice) return null;

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Couple Of Offers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#743D60',
    });
  }

  // Get Expo push token (works with both Expo Go and standalone builds)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const registeredFor = useRef<string | null>(null);
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!Notifications) return; // package not installed

    // Foreground notification display behaviour
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Register & sync token
    registerForPushNotifications()
      .then(async (token) => {
        if (!token || registeredFor.current === token) return;
        registeredFor.current = token;

        try {
          await apiClient('/api/v1/notifications/devices', {
            method: 'POST',
            body: JSON.stringify({
              token,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
            }),
          });
        } catch {
          // Non-fatal — token sync will retry next app launch
        }
      })
      .catch(() => {});

    // Foreground notification received
    notifListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      // The notification is displayed automatically via setNotificationHandler above.
      // Additional in-app side-effects (e.g. refreshing bookings list) can go here.
      console.log('[Push] Received in foreground:', notification.request.content.title);
    });

    // User tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as Record<string, any>;
      // Deep-link routing based on notification type is handled by the
      // existing notificationDestination() helper in notificationService.ts
      console.log('[Push] User tapped notification:', data);
    });

    return () => {
      if (notifListener.current) {
        Notifications?.removeNotificationSubscription(notifListener.current);
      }
      if (responseListener.current) {
        Notifications?.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []); // Run once on mount

  // Re-register when user logs in (token is now associated with an account)
  useEffect(() => {
    if (!user?.email || !Notifications) return;

    registerForPushNotifications()
      .then(async (token) => {
        if (!token) return;
        try {
          await apiClient('/api/v1/notifications/devices', {
            method: 'POST',
            body: JSON.stringify({
              token,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
            }),
          });
        } catch {
          // Non-fatal
        }
      })
      .catch(() => {});
  }, [user?.email]);
}
