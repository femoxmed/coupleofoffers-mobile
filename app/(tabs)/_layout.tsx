import React from 'react';
import { Tabs } from 'expo-router';
import { Palette } from '../../constants/Colors';
import { WhatsAppTabBar } from '../../components/WhatsAppTabBar';
import { useAuthStore } from '../../store/useAuthStore';

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <Tabs
      tabBar={(props) => <WhatsAppTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#301D32',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 2,
          borderBottomWidth: 1,
          borderBottomColor: '#E8DBC6',
        },
        headerTintColor: Palette.aubergine,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: -0.3,
        },
      }}
    >
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />

      {/* 2. Explore */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerTitle: 'Explore Experiences',
        }}
      />

      {/* 3. Venues */}
      <Tabs.Screen
        name="partners"
        options={{
          title: 'Venues',
          headerTitle: 'Curated Venues',
        }}
      />

      {/* 4. Bookings */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          headerShown: false,
        }}
      />

      {/* 5. Account / Get Started */}
      <Tabs.Screen
        name="profile"
        options={{
          title: user ? 'Account' : 'Get Started',
          headerTitle: user ? 'Profile & Concierge' : 'Get Started',
        }}
      />

      {/* Hidden fallback screen for saved */}
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
          title: 'Saved',
          headerTitle: 'Saved Experiences',
        }}
      />
    </Tabs>
  );
}
