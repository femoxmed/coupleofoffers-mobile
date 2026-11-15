import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Palette } from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useSavedStore } from '../store/useSavedStore';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3, // 3 minutes
            retry: 2,
          },
        },
      })
  );

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  useEffect(() => {
    useAuthStore.getState().initAuth().catch(() => {});
    useSavedStore.getState().fetchSaved().catch(() => {});
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: true,
          headerTintColor: Palette.aubergine,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: Palette.porcelain,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="offer/[id]"
          options={{
            headerTitle: 'Experience Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="checkout/index"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="checkout/[holdId]"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="partner/[slug]"
          options={{
            headerTitle: 'Venue Profile',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="saved"
          options={{
            headerTitle: 'Saved & Alerts',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerTitle: 'Information',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
