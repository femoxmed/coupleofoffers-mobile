import { CatalogImage } from './CatalogImage';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useRouter } from 'expo-router';
import { MapPin, Utensils, ArrowRight } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { formatNaira} from '../constants/config';

import type { Partner } from '../types';

interface PartnerCardProps {
  partner: Partner;
  width?: number;
}

export function PartnerCard({ partner, width }: PartnerCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/partner/${partner.slug || partner.id}`);
  };


  // Keep the area label compact.
  const rawArea = partner.area || partner.address || 'City Center';
  const cleanArea =
    rawArea
      .replace(/,\s*Lagos/gi, '')
      .replace(/Lagos/gi, '')
      .replace(/,\s*Nigeria/gi, '')
      .trim() || 'City Center';

  const isFullWidth = width === undefined;

  const cleanPartnerName = partner.name.trim();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[styles.card, isFullWidth ? styles.fullWidthCard : { width }]}
    >
      {/* 1. Venue Photo Banner (reduced height to eliminate bulk) */}
      <View style={[styles.imageContainer, { height: isFullWidth ? 116 : 108 }]}>
        <CatalogImage url={partner.banner_url} category={partner.primary_category || "venues"} style={styles.image} />

        {/* Floating top badges */}
        <View style={styles.topBadgesRow}>
          <View style={styles.categoryPill}>
            <Utensils size={9.5} color={Palette.aubergine} style={{ marginRight: 3.5 }} />
            <Text style={styles.categoryPillText}>
              {partner.primary_category || 'Venue'}
            </Text>
          </View>

          {partner.package_count > 0 && (
            <View style={styles.packagePill}>
              <Text style={styles.packagePillText}>
                {partner.package_count}{' '}
                {partner.package_count === 1 ? 'Date' : 'Dates'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Venue Body (Sleek 2-row layout without bulky divider or multiline text) */}
      <View style={styles.body}>
        {/* Row 1: Venue Name + Starting Price */}
        <View style={styles.topRow}>
          <Text style={styles.venueName} numberOfLines={1}>
            {cleanPartnerName}
          </Text>
          {partner.starting_price_kobo != null && (
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>From </Text>
              <Text style={styles.priceText}>
                {formatNaira(partner.starting_price_kobo)}
              </Text>
            </View>
          )}
        </View>

        {/* Row 2: Location Area + View Dates Button */}
        <View style={styles.bottomRow}>
          <View style={styles.areaRow}>
            <MapPin size={11} color={Palette.mulberry} style={{ marginRight: 3 }} />
            <Text style={styles.areaText} numberOfLines={1}>
              {cleanArea}
            </Text>
          </View>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Packages</Text>
            <ArrowRight size={10.5} color={Palette.aubergine} style={{ marginLeft: 3 }} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fullWidthCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: Palette.muted,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 252, 247, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Palette.aubergine,
    textTransform: 'capitalize',
  },
  packagePill: {
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  packagePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFCF7',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Palette.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueName: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.2,
    marginRight: 8,
  },
  priceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontSize: 10,
    color: Palette.mutedText,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  areaText: {
    fontSize: 11.5,
    color: Palette.mutedText,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.12)',
  },
  viewButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
});
