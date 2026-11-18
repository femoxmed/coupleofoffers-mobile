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

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    area?: string;
    partySize?: string;
    priceRange?: string;
  }>();

  const searchQuery = useSearchStore((s) => s.query);
  const setSearchQuery = useSearchStore((s) => s.setQuery);
  const [filters, setFilters] = useState<FilterState>({
    category: params.category || 'all',
    area: params.area || 'all',
    partySize: params.partySize || 'all',
    priceRange: params.priceRange || 'all',
  });

  useEffect(() => {
    if (params.q !== undefined) setSearchQuery(params.q);
    if (params.category !== undefined) {
      // Find matching category ID if a name was passed
      const match = CATEGORY_OPTIONS.find(
        (c) =>
          c.id.toLowerCase() === params.category?.toLowerCase() ||
          c.label.toLowerCase().includes(params.category?.toLowerCase() || '')
      );
      setFilters((prev) => ({ ...prev, category: match ? match.id : params.category || 'all' }));
    }
    if (params.area !== undefined) {
      setFilters((prev) => ({ ...prev, area: params.area || 'all' }));
    }
  }, [params.q, params.category, params.area]);

  const { data: offers, isLoading, isRefetching, isError, refetch } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: () => catalogService.getOffers(),
  });

  // Extract distinct clean areas from live offers
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    offers?.forEach((o) => {
      const a = (o.street_address || o.venue || '')
        .replace(/,\s*Lagos/gi, '')
        .replace(/Lagos/gi, '')
          .trim();
      if (a) {
        const primary = a.split(',')[0].trim();
        if (primary) set.add(primary);
      }
    });
    return ['All Areas', ...Array.from(set)];
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
        offer.category.toLowerCase().includes(query);

      // 2. Category Filter
      let matchesCategory = true;
      if (filters.category !== 'all') {
        const cat = filters.category.toLowerCase();
        matchesCategory =
          offer.category.toLowerCase().includes(cat) ||
          (cat === 'dining' && offer.category.toLowerCase().includes('dinner'));
      }

      // 3. Area Filter
      let matchesArea = true;
      if (filters.area !== 'all' && filters.area !== 'All Areas') {
        const addr = (offer.street_address || offer.venue || '').toLowerCase();
        matchesArea = addr.includes(filters.area.toLowerCase());
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

      return matchesSearch && matchesCategory && matchesArea && matchesParty && matchesPrice;
    });
  }, [offers, searchQuery, filters]);

  return (
    <View style={styles.container}>
      <BrandRefreshFlatList
        data={filteredOffers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OfferCard offer={item} layout="compact" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => {
              refetch();
            }}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Reusable Themed Search Bar with Filter in the Search Box */}
            <ThemedSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search experiences, venues, or areas..."
              filters={filters}
              onApplyFilters={setFilters}
              availableAreas={availableAreas}
              showFilterChips={true}
            />

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
