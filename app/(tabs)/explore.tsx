import { BrandRefreshFlatList } from '../../components/BrandRefreshScrollView';
import { BrandLoader } from '../../components/BrandLoader';
import { DataState } from '../../components/DataState';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Palette } from '../../constants/Colors';
import { catalogService } from '../../services/catalog';
import { OfferCard } from '../../components/OfferCard';
import {
  ThemedSearchBar,
  FilterState,
  DEFAULT_FILTERS,
  CATEGORY_OPTIONS,
} from '../../components/ThemedSearchBar';
import type { Offer } from '../../types';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import { getOfferDistanceBadge } from '../../utils/distance';

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    categories?: string;
    area?: string;
    state?: string;
    city?: string;
    partySize?: string;
    priceRange?: string;
  }>();

  const parseCategoryParam = (raw?: string): string[] => {
    if (!raw || raw === 'all' || raw === 'All Dates' || raw === 'All offers') return ['all'];
    const parts = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
    const resolved = parts.map((part) => {
      const match = CATEGORY_OPTIONS.find(
        (c) =>
          c.id.toLowerCase() === part ||
          c.label.toLowerCase() === part ||
          c.label.toLowerCase().includes(part)
      );
      return match ? match.id : part;
    });
    return resolved.length > 0 ? resolved : ['all'];
  };

  const { currentLocation } = useLocationStore();
  const searchQuery = useSearchStore((s) => s.query);
  const setSearchQuery = useSearchStore((s) => s.setQuery);

  const [filters, setFilters] = useState<FilterState>(() => {
    const initialCats = parseCategoryParam(params.categories || params.category);
    return {
      category: initialCats.join(','),
      categories: initialCats,
      area: params.area || params.city || 'all',
      state: params.state || 'all',
      city: params.city || 'all',
      partySize: params.partySize || 'all',
      priceRange: params.priceRange || 'all',
    };
  });

  useEffect(() => {
    if (params.q !== undefined) setSearchQuery(params.q);
    if (params.category !== undefined || params.categories !== undefined) {
      const parsed = parseCategoryParam(params.categories || params.category);
      setFilters((prev) => ({
        ...prev,
        categories: parsed,
        category: parsed.join(','),
      }));
    }
    if (params.area !== undefined || params.city !== undefined) {
      setFilters((prev) => ({
        ...prev,
        area: params.area || params.city || 'all',
        city: params.city || params.area || 'all',
      }));
    }
    if (params.state !== undefined) {
      setFilters((prev) => ({ ...prev, state: params.state || 'all' }));
    }
  }, [params.q, params.category, params.categories, params.area, params.state, params.city]);

  const { data: offers, isLoading, isRefetching, isError, refetch } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: () => catalogService.getOffers(),
  });

  // Extract distinct clean areas from live offers
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    offers?.forEach((o) => {
      if (o.city) set.add(o.city.trim());
      const a = (o.street_address || o.venue || '')
        .replace(/,\s*Lagos/gi, '')
        .replace(/Lagos/gi, '')
        .replace(/,\s*Nigeria/gi, '')
        .trim();
      if (a) {
        const primary = a.split(',')[0].trim();
        if (primary && !/demo/i.test(primary)) set.add(primary);
      }
    });
    return ['All Areas', ...Array.from(set).sort()];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const list = offers || [];
    return list.filter((offer) => {
      // 1. Text Search
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        offer.title.toLowerCase().includes(query) ||
        offer.venue_name?.toLowerCase().includes(query) ||
        offer.street_address?.toLowerCase().includes(query) ||
        offer.city?.toLowerCase().includes(query) ||
        offer.state?.toLowerCase().includes(query) ||
        offer.category.toLowerCase().includes(query);

      // 2. Category Filter (multi-select)
      let matchesCategory = true;
      const activeCats = (filters.categories && filters.categories.length > 0)
        ? filters.categories
        : (filters.category && filters.category !== 'all'
            ? filters.category.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
            : ['all']);

      if (!activeCats.includes('all')) {
        const offerCat = offer.category.toLowerCase();
        matchesCategory = activeCats.some(
          (cat) =>
            offerCat.includes(cat) ||
            (cat === 'dining' && offerCat.includes('dinner'))
        );
      }

      // 3. Location Filter (State & City / Area)
      let matchesLocation = true;
      if (filters.state && filters.state !== 'all') {
        const offerState = (offer.state || '').toLowerCase();
        const targetState = filters.state.toLowerCase();
        matchesLocation =
          offerState === targetState ||
          (targetState.includes('lagos') && !offer.state);
      }
      if (
        matchesLocation &&
        filters.city &&
        filters.city !== 'all' &&
        filters.city !== 'All Areas' &&
        filters.city !== 'All Locations'
      ) {
        const targetCity = filters.city.toLowerCase();
        const offerCity = (offer.city || '').toLowerCase();
        const addr = (offer.street_address || offer.venue || '').toLowerCase();
        matchesLocation = offerCity.includes(targetCity) || addr.includes(targetCity);
      } else if (
        matchesLocation &&
        filters.area &&
        filters.area !== 'all' &&
        filters.area !== 'All Areas' &&
        filters.area !== 'All Locations'
      ) {
        const targetArea = filters.area.toLowerCase();
        const offerCity = (offer.city || '').toLowerCase();
        const addr = (offer.street_address || offer.venue || '').toLowerCase();
        matchesLocation = offerCity.includes(targetArea) || addr.includes(targetArea);
      }

      // 4. Party Size Filter
      let matchesParty = true;
      if (filters.partySize === '2') {
        matchesParty = offer.party_size === 2;
      } else if (filters.partySize === 'group') {
        matchesParty = (offer.max_party_size || offer.party_size) > 2;
      }

      // 5. Price Range Filter
      let matchesPrice = true;
      const kobo = offer.price_kobo;
      if (filters.priceRange === 'under-50k') {
        matchesPrice = kobo <= 5000000;
      } else if (filters.priceRange === '50k-100k') {
        matchesPrice = kobo >= 5000000 && kobo <= 10000000;
      } else if (filters.priceRange === '100k-200k') {
        matchesPrice = kobo >= 10000000 && kobo <= 20000000;
      } else if (filters.priceRange === 'above-200k') {
        matchesPrice = kobo > 20000000;
      }

      return matchesSearch && matchesCategory && matchesLocation && matchesParty && matchesPrice;
    });
  }, [offers, searchQuery, filters]);

  return (
    <View style={styles.container}>
      {/* Fixed search bar — always visible above the scrollable list */}
      <ThemedSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search experiences, venues, or areas..."
        filters={filters}
        onApplyFilters={setFilters}
        availableAreas={availableAreas}
        showFilterChips={true}
      />

      <BrandRefreshFlatList
        data={filteredOffers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            layout="compact"
            distanceBadge={getOfferDistanceBadge(
              item,
              currentLocation?.latitude,
              currentLocation?.longitude
            )}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => {
              refetch();
            }}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Results Counter Row */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {filteredOffers.length}{' '}
                {filteredOffers.length === 1 ? 'Experience' : 'Experiences'} Available
              </Text>

              {Object.values(filters).some((v) => v !== 'all' && v !== 'All Areas') && (
                <TouchableOpacity
                  onPress={() => setFilters(DEFAULT_FILTERS)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearAllText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          isError ? <DataState message="Unable to load data. Check your connection and try again." onRetry={() => { void refetch(); }} /> : isLoading ? (
            <View style={styles.centered}>
              <BrandLoader size="large" color={Palette.mulberry} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No matching experiences</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters or search keywords to explore more packages.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setFilters(DEFAULT_FILTERS);
                }}
                style={styles.resetButton}
                activeOpacity={0.85}
              >
                <Text style={styles.resetButtonText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  listContent: {
    paddingBottom: 130,
  },
  headerBlock: {
    paddingBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.mutedText,
    letterSpacing: 0.2,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.mulberry,
    textDecorationLine: 'underline',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetButtonText: {
    color: Palette.porcelain,
    fontSize: 13,
    fontWeight: '700',
  },
});
