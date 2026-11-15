import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
  House,
  Compass,
  Store,
  CalendarCheck,
  User,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { useSavedStore } from '../store/useSavedStore';
import { useAuthStore } from '../store/useAuthStore';

interface TabItemConfig {
  name: string;
  label: string;
  icon: any;
  showDot?: boolean;
}

const TAB_CONFIGS: TabItemConfig[] = [
  { name: 'index', label: 'Home', icon: House },
  { name: 'explore', label: 'Explore', icon: Compass },
  { name: 'partners', label: 'Venues', icon: Store },
  { name: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { name: 'profile', label: 'Account', icon: User, showDot: true },
];

const TAB_PATHS: Record<string, string> = {
  index: '/(tabs)',
  explore: '/(tabs)/explore',
  partners: '/(tabs)/partners',
  bookings: '/(tabs)/bookings',
  profile: '/(tabs)/profile',
};

export function WhatsAppTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { savedOffers } = useSavedStore();
  const user = useAuthStore((s) => s.user);

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) + 4 : 16,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.capsule}>
        {TAB_CONFIGS.map((tab) => {
          const routes = state?.routes || [];
          const routeIndex = routes.findIndex((r: any) => r.name === tab.name);

          // Check focus via tab index or current pathname
          const isFocused =
            (state && routeIndex !== -1 && state.index === routeIndex) ||
            (tab.name === 'index'
              ? pathname === '/' || pathname === '/(tabs)'
              : pathname.startsWith(`/(tabs)/${tab.name}`) || pathname.startsWith(`/${tab.name}`));

          const Icon = tab.icon;

          const onPress = () => {
            if (isFocused) return;

            // Optional safe emit if navigation is available
            if (navigation?.emit && routeIndex !== -1 && routes[routeIndex]?.key) {
              try {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: routes[routeIndex].key,
                  canPreventDefault: true,
                });
                if (event?.defaultPrevented) return;
              } catch {
                // Ignore navigation emit errors
              }
            }

            const targetPath = TAB_PATHS[tab.name] || `/(tabs)/${tab.name}`;
            try {
              router.navigate(targetPath as any);
            } catch {
              router.push(targetPath as any);
            }
          };

          const tabLabel = tab.name === 'profile' ? (user ? 'Account' : 'Get Started') : tab.label;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tabLabel}
            >
              <View style={styles.tabInner}>
                {/* Active indicator gives generous room around the icon */}
                <View
                  style={[
                    styles.iconWrap,
                    isFocused && styles.activeIconWrap,
                  ]}
                >
                  <Icon
                    size={20}
                    color={isFocused ? Palette.aubergine : Palette.mutedText}
                    strokeWidth={isFocused ? 2.5 : 2.0}
                  />

                  {/* Badges only when authenticated */}
                  {tab.name === 'bookings' && user && false && (
                    <View style={styles.pillBadge}>
                      <Text style={styles.pillBadgeText}>1</Text>
                    </View>
                  )}

                  {tab.showDot && user && false && (
                    <View style={styles.dotBadge} />
                  )}
                </View>

                {/* Tab Label */}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {tabLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 9999,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 68,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: '#E8DBC6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  activeIconWrap: {
    backgroundColor: Palette.secondaryBg, // #EFE3E7 brand capsule wash
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  activeTabLabel: {
    color: Palette.aubergine, // #301D32 brand regal dark
    fontWeight: '800',
  },
  inactiveTabLabel: {
    color: Palette.mutedText, // #695A63 brand muted slate/plum
    fontWeight: '600',
  },
  dotBadge: {
    position: 'absolute',
    top: 2,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.mulberry, // #743D60 brand signature mulberry
    borderWidth: 1.5,
    borderColor: Palette.card,
  },
  pillBadge: {
    position: 'absolute',
    top: 1,
    right: 8,
    backgroundColor: Palette.mulberry, // #743D60 brand signature mulberry
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.card,
  },
  pillBadgeText: {
    color: Palette.porcelain, // #FAF5ED brand porcelain
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 11,
  },
});
