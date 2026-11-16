import { DataState } from '../../components/DataState';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Palette } from '../../constants/Colors';
import { catalogService } from '../../services/catalog';
import { PartnerCard } from '../../components/PartnerCard';
import {
  ThemedSearchBar,
  FilterState,
  DEFAULT_FILTERS,
} from '../../components/ThemedSearchBar';
import type { Partner } from '../../types';

export default function PartnersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { data: partners, isLoading, isRefetching, isError, refetch } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: () => catalogService.getPartners(),
  });

  const partnerList = partners || [];

  // Extract distinct clean areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    partnerList.forEach((p) => {
      const a = (p.area || p.address || '')
        .replace(/,\s*Lagos/gi, '')
        .replace(/Lagos/gi, '')
          .trim();
      if (a) set.add(a.split(',')[0].trim());
    });
    return ['All Areas', ...Array.from(set)];
  }, [partnerList]);

  const filteredPartners = useMemo(() => {
    return partnerList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.area && p.area.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.primary_category && p.primary_category.toLowerCase().includes(q));

      // Area filter
      let matchesArea = true;
      if (filters.area !== 'all' && filters.area !== 'All Areas') {
        const pArea = (p.area || p.address || '').toLowerCase();
        matchesArea = pArea.includes(filters.area.toLowerCase());
      }

      // Category filter
      let matchesCategory = true;
      if (filters.category !== 'all') {
        const cat = filters.category.toLowerCase();
        const pCat = (p.primary_category || (p as any).cuisine_type || '').toLowerCase();
        matchesCategory = pCat.includes(cat);
      }

      return matchesSearch && matchesArea && matchesCategory;
    });
  }, [partnerList, searchQuery, filters]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPartners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PartnerCard partner={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor={Palette.mulberry}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Partner Venues</Text>
              <Text style={styles.subtitle}>
                Verified partner restaurants, boutique rooftops, and intimate spaces.
              </Text>
            </View>

            {/* Reused Themed Search Bar with Filter in the Search Box */}
            <ThemedSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search venues by name or area..."
              filters={filters}
              onApplyFilters={setFilters}
              availableAreas={areas}
              showFilterChips={true}
            />

            <View style={styles.metaRow}>
              <Text style={styles.metaCount}>
                {filteredPartners.length}{' '}
                {filteredPartners.length === 1 ? 'Venue' : 'Venues'} Available
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
              <ActivityIndicator size="large" color={Palette.mulberry} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No venues match your search</Text>
              <Text style={styles.emptySubtitle}>
                Try selecting a different neighborhood or clearing your search filters.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setFilters(DEFAULT_FILTERS);
                }}
                style={styles.resetBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.resetBtnText}>View All Venues</Text>
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
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.mutedText,
    marginTop: 3,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  metaCount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.mutedText,
    letterSpacing: 0.3,
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
  resetBtn: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetBtnText: {
    color: Palette.porcelain,
    fontSize: 13,
    fontWeight: '700',
  },
});
