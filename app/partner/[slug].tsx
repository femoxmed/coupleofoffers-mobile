import { DataState } from '../../components/DataState';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  MapPin,
  Utensils,
  Calendar,
  Share2,
  Navigation,
  ShieldCheck,
  Clock,
  ChevronLeft,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { formatNaira, resolveImageUrl, Config } from '../../constants/config';
import { resolveImageSource } from '../../constants/images';
import { catalogService, type PartnerDetail } from '../../services/catalog';
import { OfferCard } from '../../components/OfferCard';

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'CO'
  );
}

export default function PartnerDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { data: partner, isLoading, refetch } = useQuery<PartnerDetail>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing slug');
      return catalogService.getPartnerBySlug(slug);
    },
  });

  const handleShare = async () => {
    if (!partner) return;
    try {
      await Share.share({
        message: `Check out date experiences at ${partner.name} on Couple Of Offers: https://coupleofoffers.ng/partners/${partner.slug}`,
      });
    } catch {}
  };

  const handleDirections = () => {
    if (!partner) return;
    const destination = encodeURIComponent(partner.address || partner.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`);
  };

  if (!isLoading && !partner) {
    return <DataState message="Unable to load this partner." onRetry={() => { void refetch(); }} />;
  }

  if (isLoading || !partner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.mulberry} />
      </View>
    );
  }

  const banner = resolveImageUrl(partner.banner_url, Config.FALLBACK_VENUE_IMAGE);
  const packages = partner.packages || [];
  const cleanArea = (partner.area || partner.address || 'City Center')
    .replace(/,\s*Lagos/gi, '')
    .replace(/Lagos/gi, '')
    .replace(/,\s*Nigeria/gi, '')
    .trim() || 'City Center';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Cover Banner with dark gradient (matching web app) */}
        <View style={styles.heroContainer}>
          <Image
            source={resolveImageSource(partner.banner_url, Config.FALLBACK_VENUE_IMAGE)}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroScrim} />

          {/* Top floating share button */}
          <TouchableOpacity
            style={styles.floatingShare}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={16} color="#FFFCF7" />
          </TouchableOpacity>

          {/* Bottom hero content */}
          <View style={styles.heroBottomRow}>
            {/* Monogram / Logo badge (matching web app) */}
            <View style={styles.monogramBadge}>
              {partner.logo_url ? (
                <Image
                  source={resolveImageSource(partner.logo_url, Config.FALLBACK_VENUE_IMAGE)}
                  style={styles.logoImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.monogramText}>{getInitials(partner.name)}</Text>
              )}
            </View>

            <View style={styles.titleInfoBlock}>
              <View style={styles.metaRow}>
                <View style={styles.categoryPill}>
                  <Utensils size={10} color={Palette.aubergine} style={{ marginRight: 3 }} />
                  <Text style={styles.categoryPillText}>
                    {partner.primary_category || 'Dining'}
                  </Text>
                </View>

                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={11} color={Palette.goldInk} style={{ marginRight: 3 }} />
                  <Text style={styles.verifiedText}>VERIFIED PARTNER</Text>
                </View>
              </View>

              <Text style={styles.partnerName} numberOfLines={2}>
                {partner.name}
              </Text>

              <View style={styles.areaRow}>
                <MapPin size={12} color="#E8DCD9" style={{ marginRight: 4 }} />
                <Text style={styles.areaText} numberOfLines={1}>
                  {cleanArea}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Venue Actions (Get Directions & Share) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <Navigation size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={15} color={Palette.aubergine} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Share Venue</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Venue Ambiance Photo Gallery */}
        {partner.gallery.length > 0 && <View style={styles.gallerySection}>
          <Text style={styles.sectionHeaderTitle}>Venue Ambiance</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScroll}
          >
            {partner.gallery.map((imgUrl, idx) => (
              <View key={idx} style={styles.galleryItemWrapper}>
                <Image
                  source={resolveImageSource(imgUrl, Config.FALLBACK_OFFER_IMAGE)}
                  style={styles.galleryPhoto}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ))}
          </ScrollView>
        </View>}

        {/* 4. Starting Price & Trust Promise Card */}
        <View style={styles.pricingHighlightCard}>
          <View>
            <Text style={styles.pricingLabel}>Packages from</Text>
            <Text style={styles.pricingAmount}>
              {partner.starting_price_kobo == null ? 'No offers available' : formatNaira(partner.starting_price_kobo)}
            </Text>
          </View>

          <View style={styles.pricingTrustPill}>
            <ShieldCheck size={14} color={Palette.mulberry} style={{ marginRight: 4 }} />
            <Text style={styles.pricingTrustText}>Upfront package pricing</Text>
          </View>
        </View>

        {/* 5. Bio / About the Venue */}
        {partner.description ? (
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>About the Venue</Text>
            <Text style={styles.aboutText}>{partner.description}</Text>
          </View>
        ) : null}

        {/* 6. Exclusive Date Packages for this Partner */}
        <View style={styles.packagesSection}>
          <View style={styles.packagesHeader}>
            <Text style={styles.packagesTitle}>Available Date Experiences</Text>
            <Text style={styles.packagesSubtitle}>
              Curated exclusively for couples. Pay one discounted price upfront.
            </Text>
          </View>

          {packages.length > 0 ? (
            packages.map((pkg) => (
              <OfferCard key={pkg.id} offer={pkg} layout="compact" />
            ))
          ) : (
            <View style={styles.emptyPackagesCard}>
              <Calendar size={28} color={Palette.mutedText} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyPackagesTitle}>No active public slots right now</Text>
              <Text style={styles.emptyPackagesSubtitle}>
                New date night packages for {partner.name} drop every Thursday.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.porcelain,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroContainer: {
    height: 185,
    width: '100%',
    position: 'relative',
    backgroundColor: Palette.aubergine,
    justifyContent: 'flex-end',
    padding: 12,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 12, 26, 0.65)',
  },
  floatingShare: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(48, 29, 50, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monogramBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.champagne,
    backgroundColor: Palette.mulberry,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  monogramText: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.champagne,
    letterSpacing: 0.5,
  },
  titleInfoBlock: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Palette.aubergine,
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.champagne,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: Palette.goldInk,
    letterSpacing: 0.4,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFCF7',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: 2,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaText: {
    fontSize: 12,
    color: '#E8DCD9',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  gallerySection: {
    marginTop: 6,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  galleryScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  galleryItemWrapper: {
    width: 140,
    height: 95,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Palette.muted,
  },
  galleryPhoto: {
    width: '100%',
    height: '100%',
  },
  pricingHighlightCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: Palette.secondaryBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.15)',
  },
  pricingLabel: {
    fontSize: 11,
    color: Palette.mutedText,
    marginBottom: 2,
  },
  pricingAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  pricingTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pricingTrustText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  aboutCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 13,
    color: Palette.mutedText,
    lineHeight: 19,
  },
  packagesSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  packagesHeader: {
    marginBottom: 10,
  },
  packagesTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.3,
  },
  packagesSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 2,
  },
  emptyPackagesCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: 8,
  },
  emptyPackagesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 4,
  },
  emptyPackagesSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
  },
});
