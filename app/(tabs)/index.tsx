import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Heart,
  Store,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { catalogService, DEMO_PARTNERS, WEB_HOMEPAGE_SLIDES } from '../../services/catalog';
import { useSavedStore } from '../../store/useSavedStore';
import { Image } from 'expo-image';
import { resolveImageSource } from '../../constants/images';
import { Config } from '../../constants/config';
import { BrandLogo } from '../../components/BrandLogo';
import { HeroCarousel } from '../../components/HeroCarousel';
import { TopCategoryNav } from '../../components/TopCategoryNav';
import { PartnerCard } from '../../components/PartnerCard';
import { OfferCard } from '../../components/OfferCard';
import {
  ThemedSearchBar,
  FilterState,
  DEFAULT_FILTERS,
} from '../../components/ThemedSearchBar';
import type { Offer, Partner, HomepageSlide } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { savedOffers } = useSavedStore();
  const savedCount = savedOffers.length;
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // 1. Fetch Homepage Hero Slides (exact match with web app)
  const { data: slides, refetch: refetchSlides } = useQuery<HomepageSlide[]>({
    queryKey: ['homepage-slides'],
    queryFn: () => catalogService.getHomepageSlides(),
    initialData: WEB_HOMEPAGE_SLIDES,
  });

  // 2. Fetch Featured Partners
  const { data: partners, refetch: refetchPartners } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: async () => {
      try {
        const list = await catalogService.getPartners();
        return list && list.length > 0 ? list : DEMO_PARTNERS;
      } catch {
        return DEMO_PARTNERS;
      }
    },
  });

  // 3. Fetch Offers
  const {
    data: offers,
    isRefetching,
    refetch: refetchOffers,
  } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: () => catalogService.getOffers(),
  });

  const onRefreshAll = () => {
    refetchSlides();
    refetchPartners();
    refetchOffers();
  };

  const handleSearchSubmit = () => {
    router.push({
      pathname: '/(tabs)/explore',
      params: {
        q: searchQuery.trim() || undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        area: filters.area !== 'all' && filters.area !== 'All Areas' ? filters.area : undefined,
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
        area: newFilters.area !== 'all' && newFilters.area !== 'All Areas' ? newFilters.area : undefined,
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

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* 1. Official Web App Masthead with Slogan & Top Right Location */}
      <View style={styles.masthead}>
        {/* Left: Web App Wordmark Logo + Slogan below it */}
        <BrandLogo height={28} showSlogan={true} />

        {/* Right: User's location pill + Saved wishlist */}
        <View style={styles.mastheadRight}>
          <TouchableOpacity style={styles.locationPill} activeOpacity={0.8}>
            <MapPin size={11} color={Palette.mulberry} style={{ marginRight: 3 }} />
            <Text style={styles.locationText}>Victoria Island</Text>
            <ChevronDown size={10} color={Palette.mutedText} style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.savedButton}
            onPress={() => router.push('/(tabs)/saved')}
            activeOpacity={0.8}
            accessibilityLabel="Saved experiences"
          >
            <Heart size={16} color={Palette.aubergine} />
            {savedCount > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{savedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefreshAll}
            tintColor={Palette.mulberry}
          />
        }
      >
        {/* Reusable Themed Search Bar with Filter in the Search Box (First on Homepage) */}
        <ThemedSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearchSubmit}
          placeholder="Search experiences, venues, or areas..."
          filters={filters}
          onApplyFilters={handleApplyFilters}
          showFilterChips={true}
        />

        {/* 2. Hero Editorial Carousel */}
        {slides && slides.length > 0 ? (
          <HeroCarousel
            slides={slides}
            onActionPress={() => router.push('/(tabs)/explore')}
          />
        ) : null}

        {/* 3. Categories Nav (Matching Web App Homepage - with category image & icon) */}
        <TopCategoryNav
          onSelect={(cat) => {
            router.push({
              pathname: '/(tabs)/explore',
              params: { category: cat.name === 'All offers' ? 'All Dates' : cat.name },
            });
          }}
        />

        {/* 4. Featured Partners Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
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

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={partners || DEMO_PARTNERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PartnerCard partner={item} width={260} />}
          contentContainerStyle={styles.partnersList}
        />

        {/* 5. Signature Date Experiences (Compact Layout) */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <View>
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

        <View style={styles.offersCompactList}>
          {featuredOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} layout="compact" />
          ))}
        </View>

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
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 7. The Couple Of Offers Promise Card */}
        <View style={styles.promiseCard}>
          <View style={styles.promiseIconCircle}>
            <ShieldCheck size={24} color={Palette.goldInk} />
          </View>
          <Text style={styles.promiseTitle}>Know Your Spend Before You Go</Text>
          <Text style={styles.promiseText}>
            Every package covers your entire meal, drinks, tax, and service. No bill surprises when you arrive.
          </Text>
          <View style={styles.promisePillsRow}>
            <View style={styles.promisePill}>
              <Text style={styles.promisePillText}>✓ 100% Guaranteed Pricing</Text>
            </View>
            <View style={styles.promisePill}>
              <Text style={styles.promisePillText}>✓ Handpicked Partners</Text>
            </View>
            <View style={styles.promisePill}>
              <Text style={styles.promisePillText}>✓ Table Booked</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
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
    color: Palette.porcelain,
    fontSize: 9,
    fontWeight: '800',
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
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
    height: 104,
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
});
