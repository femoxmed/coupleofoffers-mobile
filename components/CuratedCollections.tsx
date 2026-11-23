import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet, Users, ChevronRight } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { OfferCard } from './OfferCard';
import type { Offer } from '../types';

interface CuratedCollectionsProps {
  offers: Offer[];
}

export function CuratedCollections({ offers }: CuratedCollectionsProps) {
  const router = useRouter();

  // 1. Budget candidates: packages under ₦50,000 (5,000,000 kobo)
  const budgetOffers = useMemo(() => {
    if (!offers?.length) return [];
    return offers
      .filter((o) => o.price_kobo <= 5_000_000 && (o.party_size <= 2 || !o.party_size))
      .sort((a, b) => a.price_kobo - b.price_kobo)
      .slice(0, 8);
  }, [offers]);

  // 2. Group candidates: packages where extra friends can join
  const groupOffers = useMemo(() => {
    if (!offers?.length) return [];
    return offers
      .filter((o) => (o.max_party_size || 0) > o.party_size || (o.extra_friend_price_kobo || 0) > 0)
      .sort((a, b) => (b.max_party_size || 0) - (a.max_party_size || 0))
      .slice(0, 8);
  }, [offers]);

  return (
    <View style={styles.container}>
      {/* Collection 1: Under ₦50,000 */}
      {budgetOffers.length > 0 && (
        <View style={styles.collectionBlock}>
          <View style={styles.headerRow}>
            <View style={styles.heading}>
              <View style={styles.titleBadgeRow}>
                <Wallet size={15} color={Palette.goldInk} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Under ₦50,000</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Thoughtfully curated date packages with upfront pricing
              </Text>
            </View>

            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/explore',
                  params: { maxPrice: '50000' },
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={13} color={Palette.mulberry} />
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={budgetOffers}
            keyExtractor={(item) => `budget-${item.id}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <OfferCard offer={item} layout="carousel" width={240} />
            )}
          />
        </View>
      )}

      {/* Collection 2: Bring Your Friends */}
      {groupOffers.length > 0 && (
        <View style={[styles.collectionBlock, { marginTop: 24 }]}>
          <View style={styles.headerRow}>
            <View style={styles.heading}>
              <View style={styles.titleBadgeRow}>
                <Users size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Bring Your Friends</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Group dates and dinners with per-guest flexibility
              </Text>
            </View>

            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/explore',
                  params: { group: 'true' },
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={13} color={Palette.mulberry} />
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={groupOffers}
            keyExtractor={(item) => `group-${item.id}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <OfferCard offer={item} layout="carousel" width={240} />
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  collectionBlock: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  heading: {
    flex: 1,
    paddingRight: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 1,
    lineHeight: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
});
