import { BrandRefreshScrollView } from '../../components/BrandRefreshScrollView';
import { CatalogImage } from '../../components/CatalogImage';
import { ExploreInvitation } from '../../components/ExploreInvitation';
import { DataState } from '../../components/DataState';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Heart,
  Store,
  Bell,
  X,
  CheckCircle2,
  LogIn,
  Trash2,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { catalogService } from '../../services/catalog';
import { checkoutService } from '../../services/checkoutService';
import { notificationDestination, notificationService} from '../../services/notificationService';
import { useSavedStore } from '../../store/useSavedStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Image } from 'expo-image';
import { resolveImageSource } from '../../constants/images';
import { Config, formatNaira } from '../../constants/config';
import { BrandLogo } from '../../components/BrandLogo';
import { HeroCarousel } from '../../components/HeroCarousel';
import { TopCategoryNav, WEB_HOMEPAGE_CATEGORIES } from '../../components/TopCategoryNav';
import { PartnerCard } from '../../components/PartnerCard';
import { OfferCard } from '../../components/OfferCard';
import {
  ThemedSearchBar,
  FilterState,
  DEFAULT_FILTERS,
} from '../../components/ThemedSearchBar';
import { useLocationStore} from '../../store/useLocationStore';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { useSearchStore } from '../../store/useSearchStore';
import { getOfferDistanceBadge } from '../../utils/distance';
import type { Offer, Partner, HomepageSlide } from '../../types';

function searchGuestLabel(offer: Offer) {
  const guests = offer.party_size || 1;
  const hasExtraGuests = (offer.max_party_size || 0) > guests || (offer.extra_friend_price_kobo || 0) > 0;
  return hasExtraGuests ? `from ${guests} guests` : `for ${guests} guests`;
}

export default function HomeScreen() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const { savedOffers, toggleSave, fetchSaved } = useSavedStore();
  const savedCount = savedOffers.length;
  const { currentLocation, initLocation } = useLocationStore();
  const searchQuery = useSearchStore((s) => s.query);
  const setSearchQuery = useSearchStore((s) => s.setQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [savedModalTab, setSavedModalTab] = useState<'offers' | 'alerts'>('offers');

  // Load saved location on startup
  useEffect(() => {
    initLocation();
  }, [initLocation]);

  // Load user-isolated saved offers whenever auth changes
  useEffect(() => {
    fetchSaved(authUser?.email);
  }, [fetchSaved, authUser?.email]);

  // 1. Fetch Homepage Hero Slides (exact match with web app)
  const { data: slides, isError: slidesError, refetch: refetchSlides } = useQuery<HomepageSlide[]>({
    queryKey: ['homepage-slides'],
    queryFn: () => catalogService.getHomepageSlides(),
  });

  const { data: apiCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
  });
  const categories = useMemo(() => {
    if (!apiCategories?.length) return WEB_HOMEPAGE_CATEGORIES;
    return apiCategories.map((item) => ({
      id: item.slug,
      name: item.name,
      image: WEB_HOMEPAGE_CATEGORIES.find((category) => category.id === item.slug)?.image || '/images/terrace-evening.jpg',
      icon: WEB_HOMEPAGE_CATEGORIES.find((category) => category.id === item.slug)?.icon || WEB_HOMEPAGE_CATEGORIES[0].icon,
    }));
  }, [apiCategories]);

  // 2. Fetch Featured Partners
  const { data: partners, isLoading: partnersLoading, isError: partnersError, refetch: refetchPartners } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: () => catalogService.getPartners(),
  });

  // 3. Fetch Offers
  const {
    data: offers,
    isLoading: offersLoading,
    isError: offersError,
    isRefetching,
    refetch: refetchOffers,
  } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: () => catalogService.getOffers(),
  });

  // 4. Fetch Bookings for Notifications Count (strictly for this authenticated user)
  const { data: bookings, refetch: refetchBookings } = useQuery({
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

  // 5. Fetch Server In-App Notifications (strictly for this authenticated user)
  const { data: serverNotifs, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications', authUser?.email],
    refetchInterval: 30_000,
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
    return serverUnread;
  }, [authUser, serverNotifs, upcomingCount]);

  const onRefreshAll = () => {
    refetchSlides();
    refetchPartners();
    refetchOffers();
    refetchBookings();
    refetchNotifs();
  };

  const handleSearchSubmit = () => {
    router.push({
      pathname: '/(tabs)/explore',
      params: {
        q: searchQuery.trim() || undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        area: filters.area !== 'all' && filters.area !== 'All Areas' && filters.area !== 'All Locations' ? filters.area : undefined,
        state: filters.state && filters.state !== 'all' ? filters.state : undefined,
        city: filters.city && filters.city !== 'all' && filters.city !== 'All Areas' && filters.city !== 'All Locations' ? filters.city : undefined,
        partySize: filters.partySize !== 'all' ? filters.partySize : undefined,
        priceRange: filters.priceRange !== 'all' ? filters.priceRange : undefined,
      },
    });
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    router.push({
      pathname: '/(tabs)/explore',
      params: {
        q: searchQuery.trim() || undefined,
        category: newFilters.category !== 'all' ? newFilters.category : undefined,
        area: newFilters.area !== 'all' && newFilters.area !== 'All Areas' && newFilters.area !== 'All Locations' ? newFilters.area : undefined,
        state: newFilters.state && newFilters.state !== 'all' ? newFilters.state : undefined,
        city: newFilters.city && newFilters.city !== 'all' && newFilters.city !== 'All Areas' && newFilters.city !== 'All Locations' ? newFilters.city : undefined,
        partySize: newFilters.partySize !== 'all' ? newFilters.partySize : undefined,
        priceRange: newFilters.priceRange !== 'all' ? newFilters.priceRange : undefined,
      },
    });
  };

  // Top featured offers for Home
  const featuredOffers = useMemo(() => {
    const list = offers || [];
    const featured = list.filter((o) => o.homepage_featured);
    return featured.length > 0 ? featured.slice(0, 4) : list.slice(0, 4);
  }, [offers]);
  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    (offers || []).forEach((offer) => {
      if (offer.city) locations.add(offer.city.trim());
      const value = (offer.street_address || offer.venue || '').split(',')[0]?.trim();
      if (value && !/demo/i.test(value)) locations.add(value);
    });
    return ['All Locations', ...Array.from(locations).sort()];
  }, [offers]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !offers) return [];
    return offers.filter((offer) => [offer.title, offer.venue_name, offer.venue, offer.category, offer.street_address].filter(Boolean).some(value => String(value).toLowerCase().includes(q))).slice(0, 4);
  }, [offers, searchQuery]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* 1. Official Web App Masthead with Slogan & Top Right Location */}
      <View style={styles.masthead}>
        {/* Left: Web App Wordmark Logo + Slogan below it */}
        <BrandLogo height={28} showSlogan={true} />

        {/* Right: User's location pill + Saved wishlist + Notifications Bell */}
        <View style={styles.mastheadRight}>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => setIsLocationModalOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel={`Location: ${currentLocation.name}. Tap to change.`}
            accessibilityRole="button"
          >
            <MapPin size={11} color={Palette.mulberry} style={{ marginRight: 3 }} />
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
              {currentLocation.name}
            </Text>
            <ChevronDown size={10} color={Palette.mutedText} style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.savedButton}
            onPress={() => setIsSavedModalOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="Saved experiences"
            accessibilityRole="button"
          >
            <Heart
              size={16}
              color={savedCount > 0 ? Palette.saved : Palette.aubergine}
              fill={savedCount > 0 ? Palette.saved : 'transparent'}
            />
            {savedCount > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{savedCount > 9 ? '9+' : savedCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => setIsNotifModalOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Bell size={16} color={Palette.aubergine} />
            {totalAlertCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{totalAlertCount > 9 ? '9+' : totalAlertCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fixed Search Bar - always visible above scroll content */}
      <View style={styles.searchWithSuggestions}>
        <ThemedSearchBar
          value={searchQuery}
          onChangeText={(value) => { setSearchQuery(value); setSearchFocused(true); }}
          onSubmit={handleSearchSubmit}
          placeholder="Search experiences, venues, or areas..."
          filters={filters}
          onApplyFilters={handleApplyFilters}
          availableAreas={availableLocations}
          showFilterChips={true}
        />
        {searchFocused && searchQuery.trim() && (
          <View style={styles.searchSuggestions}>
            {searchSuggestions.map((offer) => <TouchableOpacity key={offer.id} style={styles.searchSuggestion} onPress={() => { setSearchFocused(false); router.push(`/offer/${offer.id}`); }}><CatalogImage url={offer.image_url} category={offer.category} style={styles.searchSuggestionImage} iconSize={18} /><View style={styles.searchSuggestionCopy}><Text style={styles.searchSuggestionTitle} numberOfLines={1}>{offer.title}</Text><Text style={styles.searchSuggestionMeta} numberOfLines={1}>{offer.venue_name || offer.venue}</Text><Text style={styles.searchSuggestionGuests}>{searchGuestLabel(offer)}</Text></View><View style={styles.searchSuggestionPriceWrap}>{(offer.regular_price_kobo || 0) > offer.price_kobo && <Text style={styles.searchSuggestionWalkIn}>{formatNaira(offer.regular_price_kobo || 0)}</Text>}<Text style={styles.searchSuggestionPrice}>{formatNaira(offer.price_kobo)}</Text>{(offer.regular_price_kobo || 0) > offer.price_kobo && <Text style={styles.searchSuggestionSaved}>Save {formatNaira((offer.regular_price_kobo || 0) - offer.price_kobo)}</Text>}</View></TouchableOpacity>)}
            <TouchableOpacity style={styles.seeAllSearch} onPress={() => { setSearchFocused(false); if (!searchSuggestions.length) setSearchQuery(''); router.push('/(tabs)/explore'); }}><Text style={styles.seeAllSearchText}>{searchSuggestions.length ? 'See all experiences' : '0 results found · See all experiences'}</Text><ChevronRight size={17} color={Palette.mulberry} /></TouchableOpacity>
          </View>
        )}
      </View>

      <BrandRefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshing={isRefetching}
        onRefresh={onRefreshAll}
      >
        {/* 2. Hero Editorial Carousel */}
        {slides && slides.length > 0 ? (
          <HeroCarousel
            slides={[
              slides[0],
              {
                ...(slides.find((slide) => slide.id === 'curated-experiences') || slides[1]),
                id: 'curated-experiences',
                label: 'Curated experiences',
                headline: 'A couple of ways',
                accent: 'to spend the day.',
                copy: 'Dinner, spa, games or something creative. Find a date experience made for you.',
                href: '/explore',
                action: 'Explore experiences',
                image: '/images/curated-experiences-couples.webp',
              },
              {
                ...(slides.find((slide) => slide.id === 'friends') || slides[2] || slides[0]),
                id: 'friends',
                label: 'Time together',
                headline: 'Make time',
                accent: 'for your people.',
                copy: 'Catch up over good food, share a laugh and find something everyone will enjoy.',
                href: '/explore?group=true',
                action: 'Explore group offers',
                image: '/images/group-friends-dining.jpg',
              },
            ]}
            onActionPress={() => router.push('/(tabs)/explore')}
          />
        ) : null}

        {/* 3. Categories Nav (Matching Web App Homepage - with category image & icon) */}
        <TopCategoryNav
          categories={categories}
          onSelect={(cat) => {
            router.push({
              pathname: '/(tabs)/explore',
              params: { category: cat.name === 'All offers' ? 'All Dates' : cat.name },
            });
          }}
        />

        {slidesError && <DataState message="Unable to load homepage slides." onRetry={() => { void refetchSlides(); }} />}

        {/* 4. Featured Partners Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeading}>
            <View style={styles.titleBadgeRow}>
              <Store size={14} color={Palette.mulberry} style={{ marginRight: 5 }} />
              <Text style={styles.sectionTitle}>Featured Partners</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Curated dining rooms, lounges, and experiential venues
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => router.push('/(tabs)/partners')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={Palette.mulberry} />
          </TouchableOpacity>
        </View>

        {(partnersLoading || partnersError || partners?.length === 0) && (
          <DataState loading={partnersLoading} message={partnersLoading ? 'Loading partners...' : partnersError ? 'Unable to load partners.' : 'No partners available yet.'} onRetry={partnersError ? () => { void refetchPartners(); } : undefined} />
        )}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={partners || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PartnerCard partner={item} width={260} />}
          contentContainerStyle={styles.partnersList}
        />

        {/* 5. Signature Date Experiences (Compact Layout) */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <View style={styles.sectionHeading}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.sectionTitle}>Featured Date Packages</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              All-inclusive menus with one upfront price for two
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={Palette.mulberry} />
          </TouchableOpacity>
        </View>

        {(offersLoading || offersError || offers?.length === 0) && (
          <DataState loading={offersLoading} message={offersLoading ? 'Loading offers...' : offersError ? 'Unable to load offers.' : 'No offers available yet.'} onRetry={offersError ? () => { void refetchOffers(); } : undefined} />
        )}
        <View style={styles.offersCompactList}>
          {featuredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              layout="compact"
              distanceBadge={getOfferDistanceBadge(
                offer,
                currentLocation?.latitude,
                currentLocation?.longitude
              )}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.browseAllBtn}
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.8}
        >
          <Text style={styles.browseAllBtnText}>Browse all experiences →</Text>
        </TouchableOpacity>

        {/* 6. Destination for Curated Experiences & Marketplace Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesSectionTitle}>
            Your destination for curated experiences and exclusive offers.
          </Text>
          <Text style={styles.categoriesSectionSub}>
            From spontaneous solo outings and romantic dates to group adventures and relaxation, discover exciting experiences, choose a package, and pay upfront — all in one place.
          </Text>

          <View style={styles.categoriesGrid}>
            {[
              {
                id: 'dining',
                name: 'Dining',
                sub: 'Restaurants, brunch and date nights',
                image: 'dining-room.jpg',
              },
              {
                id: 'spa',
                name: 'Wellness',
                sub: 'Spas, massages and relaxation',
                image: 'spa-massage.jpg',
              },
              {
                id: 'cinema',
                name: 'Entertainment',
                sub: 'Cinemas and movie experiences',
                image: 'cinema.jpg',
              },
              {
                id: 'gaming',
                name: 'Activities',
                sub: 'Gaming, bowling and fun outings',
                image: 'gaming.jpg',
              },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/explore',
                    params: { category: cat.id },
                  });
                }}
                activeOpacity={0.85}
              >
                <Image
                  source={resolveImageSource(cat.image, Config.FALLBACK_OFFER_IMAGE)}
                  style={styles.categoryCardImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.categoryCardBody}>
                  <Text style={styles.categoryCardTitle}>{cat.name}</Text>
                  <Text style={styles.categoryCardSubtitle} numberOfLines={2}>
                    {cat.sub}
                  </Text>
                <Text style={styles.categoryCardBrowse}>Browse experiences →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ExploreInvitation />
      </BrandRefreshScrollView>

      {/* ========================================================= */}
      {/* NOTIFICATIONS & TABLE ALERTS MODAL                       */}
      {/* ========================================================= */}
      <Modal
        visible={isNotifModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNotifModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.notifModalIconWrap}>
                  <Bell size={18} color={Palette.aubergine} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Notifications & Alerts</Text>
                  <Text style={styles.modalSubtitle}>
                    Table passes, arrival codes & date reminders
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsNotifModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={16} color={Palette.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
              {!authUser ? (
                <View style={styles.notifEmptyWrap}>
                  <View style={styles.notifEmptyCircle}>
                    <Bell size={28} color={Palette.mutedText} />
                  </View>
                  <Text style={styles.notifEmptyTitle}>Stay updated on your reservations</Text>
                  <Text style={styles.notifEmptyText}>
                    Sign in to view your 4-digit arrival PINs, table vouchers, and concierge alerts.
                  </Text>
                  <TouchableOpacity
                    style={styles.notifSignInBtn}
                    onPress={() => {
                      setIsNotifModalOpen(false);
                      router.push('/login');
                    }}
                    activeOpacity={0.85}
                  >
                    <LogIn size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.notifSignInBtnText}>Sign In to Account</Text>
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
                        setIsNotifModalOpen(false);
                        router.push(notificationDestination(item));
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
                              onPress={() => {
                                setIsNotifModalOpen(false);
                                router.navigate('/(tabs)/bookings');
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.notifViewPassBtnText}>View Pass →</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                </>
              ) : (
                <View style={styles.notifEmptyWrap}>
                  <View style={[styles.notifEmptyCircle, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
                    <CheckCircle2 size={28} color="#2E7D32" />
                  </View>
                  <Text style={styles.notifEmptyTitle}>You are all caught up!</Text>
                  <Text style={styles.notifEmptyText}>
                    When you reserve an experience, your confirmed date arrival codes and venue updates will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* SAVED & WISHLIST MODAL (LOVE BUTTON IN HEADER)            */}
      {/* ========================================================= */}
      <Modal
        visible={isSavedModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSavedModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.savedModalIconWrap}>
                  <Heart size={18} color={Palette.saved} fill={Palette.saved} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Saved Experiences</Text>
                  <Text style={styles.modalSubtitle}>
                    {savedOffers.length} {savedOffers.length === 1 ? 'saved package' : 'saved packages'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsSavedModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={16} color={Palette.mutedText} />
              </TouchableOpacity>
            </View>

            {/* Sub-tabs: Saved Experiences vs Saved Alerts */}
            <View style={styles.savedTabsRow}>
              <TouchableOpacity
                style={[
                  styles.savedTabBtn,
                  savedModalTab === 'offers' && styles.savedTabBtnActive,
                ]}
                onPress={() => setSavedModalTab('offers')}
                activeOpacity={0.8}
              >
                <Heart
                  size={13}
                  color={savedModalTab === 'offers' ? Palette.saved : Palette.mutedText}
                  fill={savedModalTab === 'offers' ? Palette.saved : 'transparent'}
                />
                <Text
                  style={[
                    styles.savedTabBtnText,
                    savedModalTab === 'offers' && styles.savedTabBtnTextActive,
                  ]}
                >
                  Saved Packages ({savedOffers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.savedTabBtn,
                  savedModalTab === 'alerts' && styles.savedTabBtnActive,
                ]}
                onPress={() => setSavedModalTab('alerts')}
                activeOpacity={0.8}
              >
                <Bell
                  size={13}
                  color={savedModalTab === 'alerts' ? Palette.aubergine : Palette.mutedText}
                />
                <Text
                  style={[
                    styles.savedTabBtnText,
                    savedModalTab === 'alerts' && styles.savedTabBtnTextActive,
                  ]}
                >
                  Saved Alerts ({upcomingCount})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {savedModalTab === 'offers' ? (
                savedOffers.length > 0 ? (
                  savedOffers.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.savedItemCard}
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsSavedModalOpen(false);
                        router.push(`/offer/${item.id}`);
                      }}
                    >
                      <CatalogImage url={item.image_url} style={styles.savedItemThumb} />
                      <View style={styles.savedItemContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.savedItemVenue} numberOfLines={1}>
                            {item.venue_name || 'Partner Venue'}
                          </Text>
                          <TouchableOpacity
                            hitSlop={10}
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              toggleSave(item);
                            }}
                            style={{ padding: 2 }}
                          >
                            <Trash2 size={14} color={Palette.mutedText} />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.savedItemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>

                        <View style={styles.savedItemBottom}>
                          <Text style={styles.savedItemPrice}>
                            {formatNaira(item.price_kobo)}
                            <Text style={styles.savedItemParty}> · For {item.party_size || 2}</Text>
                          </Text>

                          <View style={styles.savedBookPill}>
                            <Text style={styles.savedBookPillText}>Book Now →</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.notifEmptyWrap}>
                    <View style={[styles.notifEmptyCircle, { backgroundColor: 'rgba(224, 36, 94, 0.08)' }]}>
                      <Heart size={28} color={Palette.saved} />
                    </View>
                    <Text style={styles.notifEmptyTitle}>Your wishlist is empty</Text>
                    <Text style={styles.notifEmptyText}>
                      Tap the heart button on any date package to save it here for quick access.
                    </Text>
                    <TouchableOpacity
                      style={[styles.notifSignInBtn, { backgroundColor: Palette.aubergine }]}
                      onPress={() => {
                        setIsSavedModalOpen(false);
                        router.navigate('/(tabs)/explore');
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.notifSignInBtnText}>Explore Experiences</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                /* Saved Alerts Tab */
                !authUser ? (
                  <View style={styles.notifEmptyWrap}>
                    <View style={styles.notifEmptyCircle}>
                      <Bell size={28} color={Palette.mutedText} />
                    </View>
                    <Text style={styles.notifEmptyTitle}>Stay updated on your reservations</Text>
                    <Text style={styles.notifEmptyText}>
                      Sign in to view your 4-digit arrival PINs, table vouchers, and concierge alerts.
                    </Text>
                    <TouchableOpacity
                      style={styles.notifSignInBtn}
                      onPress={() => {
                        setIsSavedModalOpen(false);
                        router.push('/login');
                      }}
                      activeOpacity={0.85}
                    >
                      <LogIn size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.notifSignInBtnText}>Sign In to Account</Text>
                    </TouchableOpacity>
                  </View>
                ) : upcomingCount > 0 && bookings ? (
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
                            onPress={() => {
                              setIsSavedModalOpen(false);
                              router.navigate('/(tabs)/bookings');
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.notifViewPassBtnText}>View Pass →</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                ) : (
                  <View style={styles.notifEmptyWrap}>
                    <View style={[styles.notifEmptyCircle, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
                      <CheckCircle2 size={28} color="#2E7D32" />
                    </View>
                    <Text style={styles.notifEmptyTitle}>All caught up!</Text>
                    <Text style={styles.notifEmptyText}>
                      When you reserve a table, your confirmed arrival codes and alerts will appear here.
                    </Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. LOCATION PICKER & GEOCODING MODAL                      */}
      {/* ========================================================= */}
      <LocationPickerModal
        visible={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelected={(loc) => {
          if (loc.name) {
            setFilters((prev) => ({ ...prev, area: loc.name }));
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWithSuggestions: { zIndex: 20 },
  searchSuggestions: { marginHorizontal: 16, marginTop: 6, backgroundColor: Palette.card, borderRadius: 16, borderWidth: 1, borderColor: Palette.border, padding: 8, shadowColor: Palette.aubergine, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  searchSuggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Palette.border },
  searchSuggestionImage: { width: 44, height: 44, borderRadius: 10, marginRight: 10 },
  searchSuggestionCopy: { flex: 1, marginRight: 8 },
  searchSuggestionTitle: { color: Palette.aubergine, fontSize: 14, fontWeight: '800' },
  searchSuggestionMeta: { color: Palette.mutedText, fontSize: 11, marginTop: 2 },
  searchSuggestionGuests: { color: Palette.mutedText, fontSize: 10, marginTop: 2, fontWeight: '600' },
  searchSuggestionPrice: { color: Palette.mulberry, fontSize: 12, fontWeight: '800' },
  searchSuggestionWalkIn: { color: Palette.mutedText, fontSize: 10, textDecorationLine: 'line-through' },
  searchSuggestionPriceWrap: { alignItems: 'flex-end' },
  searchSuggestionSaved: { color: Palette.mulberry, fontSize: 10, fontWeight: '700', marginTop: 2 },
  seeAllSearch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 },
  seeAllSearchText: { color: Palette.mulberry, fontSize: 13, fontWeight: '800' },
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DBC6',
  },
  mastheadRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
    paddingTop: 0,
    paddingRight: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    maxWidth: 140,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
    maxWidth: 95,
  },
  savedButton: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Palette.mulberry,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  savedBadgeText: {
    color: Palette.champagne,
    fontSize: 9,
    fontWeight: '800',
  },
  notifButton: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Palette.champagne,
    borderRadius: 8.5,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#d6b783',
  },
  notifBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2E1805',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: Palette.porcelain,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 5,
    shadowColor: '#301D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: Palette.aubergine,
    paddingVertical: 6,
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.aubergine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTagsList: {
    paddingTop: 10,
    gap: 8,
  },
  quickTagChip: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  quickTagChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionHeading: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.mulberry,
    marginRight: 2,
  },
  partnersList: {
    paddingHorizontal: 16,
    gap: 14,
    paddingVertical: 4,
  },
  offersCompactList: {
    marginTop: 6,
  },
  categoriesSection: {
    marginHorizontal: 16,
    marginTop: 26,
  },
  categoriesSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.3,
    lineHeight: 23,
    marginBottom: 6,
  },
  categoriesSectionSub: {
    fontSize: 12.5,
    color: Palette.mutedText,
    lineHeight: 18,
    marginBottom: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Palette.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryCardImage: {
    width: '100%',
    height: 82,
    backgroundColor: Palette.secondaryBg,
  },
  categoryCardBody: {
    padding: 10,
  },
  categoryCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  categoryCardSubtitle: {
    fontSize: 11,
    color: Palette.mutedText,
    lineHeight: 15,
  },
  categoryCardBrowse: {
    fontSize: 12.5,
    color: Palette.mulberry,
    fontWeight: '700',
    marginTop: 6,
  },
  browseAllBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 15,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Palette.mulberry,
    alignItems: 'center',
  },
  browseAllBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  promiseCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Palette.secondaryBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.15)',
  },
  promiseIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  promiseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 4,
  },
  promiseText: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  promisePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  promisePill: {
    backgroundColor: Palette.card,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  promisePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  // Modal & Notifications styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0D0D8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifModalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(235, 179, 66, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  notifEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  notifEmptyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  notifEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 4,
    textAlign: 'center',
  },
  notifEmptyText: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  notifSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  notifSignInBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  savedModalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(224, 36, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  savedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Palette.secondaryBg,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.1)',
  },
  savedTabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.mulberry,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  savedTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mutedText,
  },
  savedTabBtnTextActive: {
    color: Palette.aubergine,
    fontWeight: '800',
  },
  savedItemCard: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.12)',
    marginBottom: 10,
    gap: 12,
    alignItems: 'center',
  },
  savedItemThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: Palette.muted,
  },
  savedItemContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  savedItemVenue: {
    fontSize: 11,
    color: Palette.mutedText,
    fontWeight: '600',
    maxWidth: '85%',
  },
  savedItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 2,
    marginBottom: 4,
  },
  savedItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  savedItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.mulberry,
  },
  savedItemParty: {
    fontSize: 10,
    fontWeight: '400',
    color: Palette.mutedText,
  },
  savedBookPill: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  savedBookPillText: {
    fontSize: 10,
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
