import { CatalogImage } from './CatalogImage';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Users, MapPin } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { formatNaira } from '../constants/config';

import { useSavedStore } from '../store/useSavedStore';
import type { Offer } from '../types';

interface OfferCardProps {
  offer: Offer;
  layout?: 'compact' | 'featured' | 'carousel';
  distanceBadge?: string;
  width?: number;
}

export function OfferCard({ offer, layout = 'compact', distanceBadge, width }: OfferCardProps) {
  const router = useRouter();
  const toggleSave = useSavedStore((state) => state.toggleSave);
  const saved = useSavedStore((state) => state.savedOffers.some((o) => o.id === offer.id));


  const handleCardPress = () => {
    router.push(`/offer/${offer.id}`);
  };

  const handleHeartPress = (e?: any) => {
    e?.stopPropagation?.();
    toggleSave({
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      venue_name: offer.venue_name || offer.venue,
      price_kobo: offer.price_kobo,
      party_size: offer.party_size,
      image_url: offer.image_url,
    });
  };

  const hasDiscount =
    offer.regular_price_kobo && offer.regular_price_kobo > offer.price_kobo;

  const cleanAddress = (offer.street_address || '')
    .replace(/,\s*Lagos/gi, '')
    .replace(/Lagos/gi, '')
    .replace(/,\s*Nigeria/gi, '')
    .trim();

  const cleanVenueName = (offer.venue_name || offer.venue || '')
    .replace(/,\s*Lagos/gi, '')
    .replace(/Lagos/gi, '')
    .trim() || 'Curated Venue';

  const allowsExtraGuests =
    (offer.max_party_size || 0) > offer.party_size ||
    (offer.extra_friend_price_kobo || 0) > 0;

  const partyBadgeLabel = `${allowsExtraGuests ? 'From' : 'For'} ${offer.party_size} ${offer.party_size === 1 ? 'guest' : 'guests'}`;

  // Compact Modern Card Layout (horizontal, sleek, luxury)
  if (layout === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleCardPress}
        style={styles.compactCard}
      >
        {/* Left: 110x110 Image */}
        <View style={styles.compactImageWrapper}>
          <CatalogImage url={offer.image_url} category={offer.category} style={styles.compactImage} />
          {distanceBadge ? (
            <View style={styles.compactDistanceBadge}>
              <MapPin size={9} color="#FFFCF7" style={{ marginRight: 2 }} />
              <Text style={styles.compactDistanceBadgeText}>{distanceBadge}</Text>
            </View>
          ) : null}
          <Pressable
            hitSlop={8}
            onPress={handleHeartPress}
            style={styles.compactHeartButton}
          >
            <Heart
              size={14}
              color={Palette.saved}
              fill={saved ? Palette.saved : 'transparent'}
            />
          </Pressable>
        </View>

        {/* Right: Info */}
        <View style={styles.compactContent}>
          <View style={styles.venueRow}>
            <MapPin size={11} color={Palette.mulberry} style={{ marginRight: 3 }} />
            <Text style={styles.venueText} numberOfLines={1}>
              {cleanVenueName}{cleanAddress ? ` • ${cleanAddress}` : ''}
            </Text>
          </View>

          <Text style={styles.compactTitle} numberOfLines={2}>
            {offer.title}
          </Text>

          {offer.short_description || offer.inclusions ? (
            <Text style={styles.compactInclusions} numberOfLines={1}>
              {(offer.short_description || offer.inclusions).replace(/\n/g, ' • ')}
            </Text>
          ) : null}
          {allowsExtraGuests && <Text style={styles.extraGuestHint} numberOfLines={1}>Each extra guest {formatNaira(offer.extra_friend_price_kobo || 0)} · Max {offer.max_party_size}</Text>}

          <View style={styles.compactFooter}>
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.compactPrice}>{formatNaira(offer.price_kobo)}</Text>
                {hasDiscount ? (
                  <Text style={styles.compactRegularPrice}>
                    {formatNaira(offer.regular_price_kobo)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.guestRow}>
                <Users size={9.5} color={Palette.mutedText} style={{ marginRight: 3 }} />
                <Text style={styles.guestSubtitle}>{partyBadgeLabel}</Text>
              </View>
            </View>

            <View style={styles.compactBookPill}>
              <Text style={styles.compactBookPillText}>Book</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Carousel Card Layout (for horizontal sliders like Near You or Featured)
  if (layout === 'carousel') {
    const cardWidth = width || 250;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleCardPress}
        style={[styles.carouselCard, { width: cardWidth }]}
      >
        <View style={styles.carouselImageContainer}>
          <CatalogImage url={offer.image_url} category={offer.category} style={styles.carouselImage} />
          <View style={styles.badgeRow}>
            <View style={styles.leftBadges}>
              {distanceBadge ? (
                <View style={styles.featuredDistanceBadge}>
                  <MapPin size={9} color="#FFFCF7" style={{ marginRight: 2.5 }} />
                  <Text style={styles.featuredDistanceBadgeText}>{distanceBadge}</Text>
                </View>
              ) : null}
            </View>

            <Pressable hitSlop={10} onPress={handleHeartPress} style={styles.heartButton}>
              <Heart
                size={14}
                color={Palette.saved}
                fill={saved ? Palette.saved : 'transparent'}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.carouselContent}>
          <View style={styles.venueRow}>
            <MapPin size={11} color={Palette.mulberry} style={{ marginRight: 3 }} />
            <Text style={styles.venueText} numberOfLines={1}>
              {cleanVenueName}{cleanAddress ? ` • ${cleanAddress}` : ''}
            </Text>
          </View>

          <Text style={styles.carouselTitle} numberOfLines={2}>
            {offer.title}
          </Text>

          <View style={styles.carouselFooter}>
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.carouselPrice}>{formatNaira(offer.price_kobo)}</Text>
                {hasDiscount ? (
                  <Text style={styles.compactRegularPrice}>
                    {formatNaira(offer.regular_price_kobo)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.guestRow}>
                <Users size={9.5} color={Palette.mutedText} style={{ marginRight: 3 }} />
                <Text style={styles.guestSubtitle}>{partyBadgeLabel}</Text>
              </View>
            </View>
            <View style={styles.carouselBookPill}>
              <Text style={styles.carouselBookPillText}>Book</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Featured Large Card Layout (for top hero highlights)
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handleCardPress}
      style={styles.featuredCard}
    >
      <View style={styles.featuredImageContainer}>
        <CatalogImage url={offer.image_url} category={offer.category} style={styles.featuredImage} />
        <View style={styles.badgeRow}>
          <View style={styles.leftBadges}>
            {distanceBadge ? (
              <View style={styles.featuredDistanceBadge}>
                <MapPin size={10} color="#FFFCF7" style={{ marginRight: 3 }} />
                <Text style={styles.featuredDistanceBadgeText}>{distanceBadge}</Text>
              </View>
            ) : null}
            {offer.homepage_featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            )}
          </View>

          <Pressable
            hitSlop={12}
            onPress={handleHeartPress}
            style={styles.heartButton}
          >
            <Heart
              size={16}
              color={Palette.saved}
              fill={saved ? Palette.saved : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.featuredContent}>
        <View style={styles.venueRow}>
          <MapPin size={12} color={Palette.mulberry} style={{ marginRight: 4 }} />
          <Text style={styles.venueText} numberOfLines={1}>
            {cleanVenueName}{cleanAddress ? ` • ${cleanAddress}` : ''}
          </Text>
        </View>

        <Text style={styles.featuredTitle} numberOfLines={2}>
          {offer.title}
        </Text>
        {allowsExtraGuests && <Text style={styles.featuredExtraGuestHint}>Each extra guest {formatNaira(offer.extra_friend_price_kobo || 0)} · Max {offer.max_party_size}</Text>}

        <View style={styles.featuredFooter}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.featuredPrice}>{formatNaira(offer.price_kobo)}</Text>
              {hasDiscount ? (
                <Text style={styles.compactRegularPrice}>
                  {formatNaira(offer.regular_price_kobo)}
                </Text>
              ) : null}
            </View>
            <View style={styles.guestRow}>
              <Users size={11} color={Palette.mutedText} style={{ marginRight: 3.5 }} />
              <Text style={styles.featuredGuestSubtitle}>{partyBadgeLabel}</Text>
            </View>
          </View>
          <View style={styles.bookPill}>
            <Text style={styles.bookPillText}>Book Offer</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact horizontal card
  compactCard: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  compactImageWrapper: {
    width: 105,
    height: 123,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Palette.muted,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactHeartButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDistanceBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(48, 29, 50, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDistanceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFCF7',
  },
  compactPartyBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(48, 29, 50, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactPartyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFCF7',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    minHeight: 105,
    paddingVertical: 2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mutedText,
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.2,
    lineHeight: 18,
    marginTop: 2,
  },
  compactInclusions: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 2,
  },
  extraGuestHint: { fontSize: 10, lineHeight: 13, color: Palette.mulberry, fontWeight: '700', marginTop: 2 },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1.5,
  },
  guestSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  featuredGuestSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  compactRegularPrice: {
    fontSize: 11,
    color: Palette.mutedText,
    textDecorationLine: 'line-through',
  },
  compactBookPill: {
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  compactBookPillText: {
    color: '#FFFCF7',
    fontWeight: '700',
    fontSize: 11,
  },

  // Featured large card
  featuredCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: Palette.muted,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 29, 50, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredDistanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFCF7',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.champagne,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.goldInk,
  },
  partyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  heartButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredContent: {
    padding: 14,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    marginVertical: 4,
    letterSpacing: -0.3,
  },
  featuredExtraGuestHint: { fontSize: 11, color: Palette.mulberry, fontWeight: '700', marginTop: 2 },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.muted,
    paddingTop: 10,
  },
  featuredPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  bookPill: {
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bookPillText: {
    color: '#FFFCF7',
    fontWeight: '700',
    fontSize: 12,
  },

  // Carousel card styles (for horizontal sliders)
  carouselCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  carouselImageContainer: {
    height: 125,
    position: 'relative',
    backgroundColor: Palette.muted,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselContent: {
    padding: 12,
  },
  carouselTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 19,
    letterSpacing: -0.2,
    minHeight: 38,
  },
  carouselFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Palette.muted,
    paddingTop: 8,
  },
  carouselPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  carouselBookPill: {
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  carouselBookPillText: {
    color: '#FFFCF7',
    fontWeight: '700',
    fontSize: 11,
  },
});
