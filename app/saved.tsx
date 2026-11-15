import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  Heart,
  Bell,
  CheckCircle2,
  Trash2,
  LogIn,
  Compass,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { Config, formatNaira } from '../constants/config';
import { resolveImageSource } from '../constants/images';
import { useSavedStore } from '../store/useSavedStore';
import { useAuthStore } from '../store/useAuthStore';
import { checkoutService } from '../services/checkoutService';
import { notificationService, ServerNotification } from '../services/notificationService';
import type { Offer } from '../types';

export default function SavedScreen() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const { savedOffers, fetchSaved, toggleSave } = useSavedStore();
  const [activeTab, setActiveTab] = useState<'offers' | 'alerts'>('offers');

  useEffect(() => {
    fetchSaved(authUser?.email);
  }, [fetchSaved, authUser?.email]);

  // Bookings strictly for the authenticated user
  const { data: bookings } = useQuery({
    queryKey: ['bookings', authUser?.email],
    queryFn: async () => {
      if (!authUser?.email) return [];
      try {
        return await checkoutService.getBookings(authUser.email);
      } catch {
        return [];
      }
    },
    enabled: Boolean(authUser?.email),
  });

  // Server notifications strictly for the authenticated user
  const { data: serverNotifs, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications', authUser?.email],
    queryFn: async () => {
      if (!authUser) return { unreadCount: 0, items: [] };
      return await notificationService.getNotifications();
    },
    enabled: Boolean(authUser),
  });

  const upcomingCount = useMemo(() => {
    if (!authUser || !bookings || !Array.isArray(bookings)) return 0;
    return bookings.filter((b) => b.status === 'confirmed').length;
  }, [authUser, bookings]);

  const totalAlertCount = useMemo(() => {
    if (!authUser) return 0;
    const serverUnread = serverNotifs?.unreadCount || 0;
    return serverUnread > 0 ? serverUnread : upcomingCount;
  }, [authUser, serverNotifs, upcomingCount]);

  return (
    <View style={styles.container}>
      {/* Top Segmented Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'offers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('offers')}
          activeOpacity={0.8}
        >
          <Heart
            size={14}
            color={activeTab === 'offers' ? '#E0245E' : Palette.mutedText}
            fill={activeTab === 'offers' ? '#E0245E' : 'transparent'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'offers' && styles.tabButtonTextActive,
            ]}
          >
            Saved Packages ({savedOffers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'alerts' && styles.tabButtonActive]}
          onPress={() => setActiveTab('alerts')}
          activeOpacity={0.8}
        >
          <Bell
            size={14}
            color={activeTab === 'alerts' ? Palette.aubergine : Palette.mutedText}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'alerts' && styles.tabButtonTextActive,
            ]}
          >
            Saved Alerts ({totalAlertCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'offers' ? (
          savedOffers.length > 0 ? (
            savedOffers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/offer/${item.id}`)}
              >
                <Image
                  source={resolveImageSource(item.image_url, Config.FALLBACK_OFFER_IMAGE)}
                  style={styles.cardThumb}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardVenue} numberOfLines={1}>
                      {item.venue_name || 'Partner Venue'}
                    </Text>
                    <TouchableOpacity
                      hitSlop={12}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        toggleSave(item);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={16} color={Palette.mutedText} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                      {formatNaira(item.price_kobo)}
                      <Text style={styles.cardParty}> · For {item.party_size || 2}</Text>
                    </Text>

                    <View style={styles.bookPill}>
                      <Text style={styles.bookPillText}>Book Now →</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(224, 36, 94, 0.08)' }]}>
                <Heart size={32} color="#E0245E" />
              </View>
              <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart on any curated package across Victoria Island, Lekki, or Ikoyi to save it here.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/explore')}
                activeOpacity={0.85}
              >
                <Compass size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.exploreBtnText}>Explore Experiences</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* Alerts / Notifications Tab */
          !authUser ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Bell size={32} color={Palette.mutedText} />
              </View>
              <Text style={styles.emptyTitle}>Sign in for table alerts</Text>
              <Text style={styles.emptySubtitle}>
                Sign in to view your 4-digit arrival PINs, table vouchers, and concierge alerts.
              </Text>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/login')}
                activeOpacity={0.85}
              >
                <LogIn size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.signInBtnText}>Sign In to Account</Text>
              </TouchableOpacity>
            </View>
          ) : (serverNotifs?.items && serverNotifs.items.length > 0) || (upcomingCount > 0 && bookings) ? (
            <>
              {serverNotifs && serverNotifs.unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllReadBtn}
                  onPress={async () => {
                    await notificationService.markAllAsRead();
                    refetchNotifs();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}

              {/* 1. Real Server In-App Notifications */}
              {serverNotifs?.items?.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.serverNotifCard,
                    !item.read_at && { borderColor: Palette.mulberry, backgroundColor: '#FFFFFF' },
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (!item.read_at) {
                      await notificationService.markAsRead(item.id);
                      refetchNotifs();
                    }
                    if (item.booking_reference) {
                      router.navigate('/(tabs)/bookings');
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {!item.read_at && <View style={styles.serverNotifUnreadDot} />}
                      <Text style={styles.serverNotifTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    {item.booking_reference && (
                      <Text style={{ fontSize: 10, color: Palette.mutedText, fontFamily: 'SpaceMono' }}>
                        Pass →
                      </Text>
                    )}
                  </View>
                  <Text style={styles.serverNotifMessage}>{item.message}</Text>
                  <Text style={styles.serverNotifDate}>
                    {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* 2. Confirmed Table Passes with Arrival Codes */}
              {bookings &&
                bookings
                  .filter((b) => b.status === 'confirmed')
                  .map((b) => (
                    <View key={b.reference} style={styles.notifCard}>
                      <View style={styles.notifCardTop}>
                        <View style={styles.notifBadgeWrap}>
                          <CheckCircle2 size={13} color="#FFFFFF" />
                          <Text style={styles.notifBadgeLabel}>Table Confirmed</Text>
                        </View>
                        <Text style={styles.notifRefText}>
                          Ref: {b.reference.slice(-10).toUpperCase()}
                        </Text>
                      </View>

                      <Text style={styles.notifOfferTitle}>{b.offerTitle}</Text>
                      <Text style={styles.notifVenueText}>
                        {b.venueName} • Table for {b.partySize}
                      </Text>

                      <View style={styles.notifPinBanner}>
                        <View>
                          <Text style={styles.notifPinBannerLabel}>Your Arrival Code</Text>
                          <Text style={styles.notifPinBannerCode}>{b.arrivalPin}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.notifViewPassBtn}
                          onPress={() => router.navigate('/(tabs)/bookings')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.notifViewPassBtnText}>View Pass →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
                <CheckCircle2 size={32} color="#2E7D32" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                When you reserve an experience, your confirmed date arrival codes and venue updates will appear here.
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(116, 61, 96, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Palette.secondaryBg,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.1)',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.mulberry,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.mutedText,
  },
  tabButtonTextActive: {
    color: Palette.aubergine,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.12)',
    marginBottom: 12,
    gap: 12,
  },
  cardThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: Palette.muted,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardVenue: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mutedText,
    maxWidth: '85%',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 2,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.mulberry,
  },
  cardParty: {
    fontSize: 10,
    fontWeight: '400',
    color: Palette.mutedText,
  },
  bookPill: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  signInBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notifCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.15)',
    marginBottom: 12,
  },
  notifCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  notifBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  notifRefText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    color: Palette.mutedText,
  },
  notifOfferTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  notifVenueText: {
    fontSize: 12,
    color: Palette.mutedText,
    marginBottom: 12,
  },
  notifPinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.secondaryBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.12)',
  },
  notifPinBannerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.mutedText,
    textTransform: 'uppercase',
  },
  notifPinBannerCode: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'SpaceMono',
    color: Palette.mulberry,
    letterSpacing: 2,
    marginTop: 2,
  },
  notifViewPassBtn: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notifViewPassBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  serverNotifCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.12)',
    marginBottom: 10,
  },
  serverNotifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.mulberry,
    marginRight: 6,
  },
  serverNotifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.aubergine,
    flex: 1,
  },
  serverNotifMessage: {
    fontSize: 12,
    color: Palette.mutedText,
    lineHeight: 17,
    marginTop: 4,
  },
  serverNotifDate: {
    fontSize: 10,
    color: Palette.mutedText,
    fontWeight: '500',
    marginTop: 6,
  },
  markAllReadBtn: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
  },
  markAllReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mulberry,
  },
});
