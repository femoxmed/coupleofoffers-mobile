import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MapPin, ChevronRight, Navigation } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { useLocationStore } from '../store/useLocationStore';
import { calculateDistanceKm } from '../utils/distance';
import { OfferCard } from './OfferCard';
import type { Offer } from '../types';

interface NearYouSectionProps {
  offers: Offer[];
  onOpenLocationPicker: () => void;
}

interface OfferWithDistance {
  offer: Offer;
  distanceKm: number | null;
  distanceBadge: string;
}

export function NearYouSection({ offers, onOpenLocationPicker }: NearYouSectionProps) {
  const currentLocation = useLocationStore((s) => s.currentLocation);

  const rankedOffers: OfferWithDistance[] = useMemo(() => {
    if (!offers?.length) return [];

    const userLat = typeof currentLocation?.latitude === 'number' ? currentLocation.latitude : null;
    const userLon = typeof currentLocation?.longitude === 'number' ? currentLocation.longitude : null;
    const userAreaLower = (currentLocation?.name || '').toLowerCase().trim();

    const ranked: OfferWithDistance[] = offers.map((offer) => {
      let bestDist: number | null = null;

      if (userLat !== null && userLon !== null) {
        if (typeof offer.latitude === 'number' && typeof offer.longitude === 'number') {
          bestDist = calculateDistanceKm(userLat, userLon, offer.latitude, offer.longitude);
        }

        if (Array.isArray(offer.branches)) {
          for (const b of offer.branches) {
            const bAny = b as any;
            if (typeof bAny.latitude === 'number' && typeof bAny.longitude === 'number') {
              const d = calculateDistanceKm(userLat, userLon, bAny.latitude, bAny.longitude);
              if (bestDist === null || d < bestDist) bestDist = d;
            }
          }
        }
      }

      let badge = '';
      if (bestDist !== null) {
        badge = bestDist < 1 ? '< 1 km away' : `${bestDist.toFixed(1)} km away`;
      } else {
        const venueStr = `${offer.venue_name || ''} ${offer.venue || ''} ${offer.street_address || ''} ${offer.city || ''}`.toLowerCase();
        if (userAreaLower && venueStr.includes(userAreaLower)) {
          badge = `Near ${currentLocation?.name || 'you'}`;
        } else {
          badge = offer.city ? `${offer.city}` : 'Lagos';
        }
      }

      return {
        offer,
        distanceKm: bestDist,
        distanceBadge: badge,
      };
    });

    // Sort: numeric distance first ascending, then area matches
    ranked.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return 0;
    });

    return ranked.slice(0, 10);
  }, [offers, currentLocation]);

  if (!rankedOffers.length) return null;

  const areaLabel = currentLocation?.name || 'You';

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.heading}>
          <View style={styles.titleBadgeRow}>
            <MapPin size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Experiences near {areaLabel}
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Curated date outings closest to your selected neighborhood
          </Text>
        </View>

        <TouchableOpacity
          style={styles.changeButton}
          onPress={onOpenLocationPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.changeText}>Change</Text>
          <ChevronRight size={13} color={Palette.mulberry} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={rankedOffers}
        keyExtractor={(item) => `near-${item.offer.id}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OfferCard
            offer={item.offer}
            layout="carousel"
            width={245}
            distanceBadge={item.distanceBadge}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    marginBottom: 8,
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
    fontSize: 15,
    fontWeight: '700',
    color: Palette.aubergine,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 1,
    lineHeight: 15,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 2,
  },
  changeText: {
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
