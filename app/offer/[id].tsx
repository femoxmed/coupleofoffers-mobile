import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import {
  MapPin,
  Users,
  Check,
  Calendar,
  Clock,
  ShieldCheck,
  Minus,
  Plus,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Navigation,
  Info,
  X,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Store,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { formatNaira, Config } from '../../constants/config';
import { resolveImageSource, LOCAL_ASSETS } from '../../constants/images';
import { catalogService } from '../../services/catalog';
import { checkoutService } from '../../services/checkoutService';
import { useSavedStore } from '../../store/useSavedStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Offer, Slot } from '../../types';

interface ExtendedOffer extends Offer {
  slots?: Slot[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isSaved, toggleSave } = useSavedStore();
  const insets = useSafeAreaInsets();

  const authUser = useAuthStore((s) => s.user);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState<number>(2);
  const [email, setEmail] = useState<string>(authUser?.email || '');
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Web-parity dropdown and calendar picker states
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    if (authUser?.email && !email) {
      setEmail(authUser.email);
    }
  }, [authUser?.email]);

  const { data: offer, isLoading } = useQuery<ExtendedOffer>({
    queryKey: ['offer', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing ID');
      const live = await catalogService.getOfferById(id);
      return live as ExtendedOffer;
    },
  });

  const basePartySize = offer?.party_size || 2;
  const maxPartySize = offer?.max_party_size || 6;
  const extraGuestPrice = offer?.extra_friend_price_kobo || 2000000;
  const allowsMoreThanTwo =
    maxPartySize > basePartySize || (offer?.extra_friend_price_kobo || 0) > 0;

  const branches = useMemo(() => offer?.branches || [], [offer?.branches]);
  const hasMultipleBranches = branches.length > 1;

  const selectedBranchObj = useMemo(() => {
    return (
      branches.find((b) => b.id === selectedBranchId) ||
      (branches.length > 0 ? branches[0] : null)
    );
  }, [branches, selectedBranchId]);

  // Today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Robust slots collection: use offer.slots if provided, otherwise generate rich daily arrival slots for the next 30 days
  const allSlots = useMemo<Slot[]>(() => {
    if (offer?.slots && offer.slots.length > 0) {
      return offer.slots;
    }
    const generated: Slot[] = [];
    const now = new Date();
    const times = ['12:30', '14:00', '18:00', '19:30', '21:00'];
    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;

      times.forEach((t, tIdx) => {
        generated.push({
          id: `slot-${dateKey}-${tIdx}`,
          offer_id: offer?.id || id || '',
          starts_at: `${dateKey}T${t}:00+01:00`,
          cutoff_at: `${dateKey}T10:00:00+01:00`,
          remaining_units: Math.floor(Math.random() * 4) + 3,
          capacity_units: 8,
        });
      });
    }
    return generated;
  }, [offer?.slots, offer?.id, id]);

  // Group slots by date string YYYY-MM-DD
  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of allSlots) {
      const d = new Date(s.starts_at);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    }
    return map;
  }, [allSlots]);

  // First available date
  const firstAvailableDate = useMemo(() => {
    const sortedDates = Object.keys(slotsByDate).sort();
    return sortedDates.find((d) => d >= todayStr) || sortedDates[0] || todayStr;
  }, [slotsByDate, todayStr]);

  // Initialize party size, branch, date and slot
  useEffect(() => {
    if (offer?.party_size && partySize < offer.party_size) {
      setPartySize(offer.party_size);
    }
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [offer, branches, selectedBranchId, partySize]);

  useEffect(() => {
    if (!selectedDate && firstAvailableDate) {
      setSelectedDate(firstAvailableDate);
      const slotsOnDay = slotsByDate[firstAvailableDate] || [];
      if (slotsOnDay.length > 0 && !selectedSlot) {
        setSelectedSlot(slotsOnDay[0].id);
      }
    }
  }, [firstAvailableDate, selectedDate, slotsByDate, selectedSlot]);

  // Formatters
  const formatSlotTime = (startsAt: string) => {
    const d = new Date(startsAt);
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDisplayDate = (dateKey: string) => {
    if (!dateKey) return 'Choose arrival date';
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calendar month navigation
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth(); // 0-indexed
  const calMonthName = calendarMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const [todayY, todayM] = todayStr.split('-').map(Number);
  const minMonth = new Date(todayY, todayM - 1, 1);
  const canGoPrevMonth = calendarMonth > minMonth;

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCalendarMonth(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth + 1, 1));
  };

  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfCalMonth = new Date(calYear, calMonth, 1);
  const leadingBlanks = (firstDayOfCalMonth.getDay() + 6) % 7; // Monday = 0

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    const slotsOnDay = slotsByDate[dateKey] || [];
    if (slotsOnDay.length > 0) {
      setSelectedSlot(slotsOnDay[0].id);
    } else {
      setSelectedSlot(null);
    }
    setIsCalendarOpen(false);
  };

  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return slotsByDate[selectedDate] || [];
  }, [selectedDate, slotsByDate]);

  const currentSelectedSlot = useMemo(() => {
    return allSlots.find((s) => s.id === selectedSlot);
  }, [allSlots, selectedSlot]);

  const saved = offer ? isSaved(offer.id) : false;

  const handleHeartPress = () => {
    if (!offer) return;
    toggleSave({
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      venue_name: cleanVenueName,
      price_kobo: offer.price_kobo,
      party_size: offer.party_size,
      image_url: offer.image_url,
    });
  };

  // Gallery images array
  const galleryPhotos = useMemo(() => {
    if (!offer) return ['terrace-evening.jpg'];
    const list: string[] = [];
    if (offer.gallery && offer.gallery.length > 0) {
      offer.gallery.forEach((url) => {
        if (url) list.push(url);
      });
    } else if (offer.image_url) {
      list.push(offer.image_url);
    }
    return list.length > 0 ? list : ['terrace-evening.jpg'];
  }, [offer]);

  const galleryScrollRef = useRef<any>(null);

  const handleNextPhoto = () => {
    if (galleryPhotos.length <= 1) return;
    const nextIndex = (activePhotoIndex + 1) % galleryPhotos.length;
    galleryScrollRef.current?.scrollTo({
      x: nextIndex * SCREEN_WIDTH,
      animated: true,
    });
    setActivePhotoIndex(nextIndex);
  };

  // Clean venue name & address to strictly adhere to brand guidelines (NO Lagos mentions)
  const cleanVenueName = useMemo(() => {
    return (offer?.venue_name || offer?.venue || '')
      .replace(/Sample\s*Lagos\s*experiences/gi, 'Curated Experiences')
      .replace(/,\s*Lagos/gi, '')
      .replace(/Lagos/gi, '')
      .replace(/[\s•\-–—]*demo\b/gi, '')
      .trim() || 'Curated Venue';
  }, [offer]);

  const cleanAddress = useMemo(() => {
    if (!offer?.street_address) return '';
    return offer.street_address
      .replace(/,\s*Lagos/gi, '')
      .replace(/Lagos/gi, '')
      .replace(/,\s*Nigeria/gi, '')
      .replace(/[\s•\-–—]*demo\b/gi, '')
      .trim();
  }, [offer]);

  // Dynamic calculated totals and savings
  const extraGuests = Math.max(0, partySize - basePartySize);
  const calculatedTotalKobo = (offer?.price_kobo || 0) + extraGuests * extraGuestPrice;

  const regularBase = offer?.regular_price_kobo || offer?.price_kobo || calculatedTotalKobo;
  const regularExtraPrice = offer?.regular_extra_guest_kobo || extraGuestPrice;
  const regularTotalKobo = regularBase + extraGuests * regularExtraPrice;

  const totalSavingsKobo = Math.max(0, regularTotalKobo - calculatedTotalKobo);
  const discountPercent =
    regularTotalKobo > 0 ? Math.round((totalSavingsKobo / regularTotalKobo) * 100) : 0;

  const handleShare = async () => {
    if (!offer) return;
    try {
      await Share.share({
        message: `${offer.title} at ${cleanVenueName} - Curated upfront date experience on Couple Of Offers.`,
        title: offer.title,
      });
    } catch {
      // User dismissed
    }
  };

  const handleOpenDirections = () => {
    if (!offer) return;
    const dest = cleanAddress || cleanVenueName || 'Victoria Island';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Directions', `Location: ${dest}`);
    });
  };

  // Launch full-screen Bachs checkout directly on mobile
  const handleProceedToExternalCheckout = async () => {
    if (hasMultipleBranches && !selectedBranchId) {
      Alert.alert('Select Branch', 'Please choose which branch location you will visit.');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Select Date & Time', 'Please select your arrival date and time slot.');
      return;
    }

    const userEmail = (authUser?.email || email).trim();
    if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
      Alert.alert(
        'Email Required',
        'Please enter a valid email address where your booking confirmation and 4-digit check-in PIN can be delivered.'
      );
      return;
    }

    const slotObj = allSlots.find((s) => s.id === selectedSlot);
    let slotFormatted = 'Reserved Slot';
    if (slotObj) {
      const d = new Date(slotObj.starts_at);
      slotFormatted = `${d.toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })}, ${d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    const resolvedVenueAddress =
      selectedBranchObj?.address?.replace(/,\s*Lagos.*$/i, '').trim() || cleanAddress;

    setIsSubmitting(true);
    try {
      const res = await checkoutService.initBachsCheckout({
        offerId: offer?.id || id || '',
        slotId: selectedSlot,
        partySize,
        totalKobo: calculatedTotalKobo,
        email: userEmail,
        offerTitle: offer?.title,
        venueName: cleanVenueName,
        venueAddress: resolvedVenueAddress,
        slotTime: slotFormatted,
      });

      // Close the booking bottom sheet
      setIsBookingModalVisible(false);

      // Open dedicated full-screen mobile Bachs checkout
      router.push({
        pathname: '/checkout',
        params: {
          authUrl: res.authorizationUrl,
          offerId: offer?.id || id || '',
          slotId: selectedSlot,
          partySize: partySize.toString(),
          amountKobo: calculatedTotalKobo.toString(),
          email: userEmail,
          offerTitle: offer?.title || 'Experience',
          venueName: cleanVenueName,
          venueAddress: resolvedVenueAddress,
          slotTime: slotFormatted,
        },
      });
    } catch (err: any) {
      console.warn('Error launching mobile Bachs checkout:', err);
      Alert.alert(
        'Payment Gateway Notice',
        err.message || 'Unable to initialize checkout. Please verify your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !offer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.mulberry} />
        <Text style={styles.loadingText}>Loading experience details...</Text>
      </View>
    );
  }

  const inclusionLines = offer.inclusions
    ? offer.inclusions.split('\n').filter(Boolean)
    : [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery Banner (Reduced height ~195px for sleek, compact layout) */}
        <View style={styles.galleryContainer}>
          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / SCREEN_WIDTH);
              setActivePhotoIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {galleryPhotos.map((photoUri, idx) => (
              <Image
                key={idx}
                source={resolveImageSource(photoUri, Config.FALLBACK_OFFER_IMAGE)}
                placeholder={LOCAL_ASSETS['terrace-evening.jpg']}
                style={styles.galleryImage}
                contentFit="cover"
                transition={200}
              />
            ))}
          </ScrollView>

          {/* Floating Top Controls (Share, Save) */}
          <View style={styles.floatingControls}>
            <View style={styles.rightIcons}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.iconCircle}
                activeOpacity={0.8}
              >
                <Share2 size={18} color={Palette.aubergine} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleHeartPress}
                style={styles.iconCircle}
                activeOpacity={0.8}
              >
                <Heart
                  size={18}
                  color={saved ? '#E11D48' : Palette.aubergine}
                  fill={saved ? '#E11D48' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Count Pill with Next Icon */}
          {galleryPhotos.length > 1 && (
            <TouchableOpacity
              onPress={handleNextPhoto}
              style={styles.photoCountPill}
              activeOpacity={0.8}
              hitSlop={8}
            >
              <Text style={styles.photoCountText}>
                {activePhotoIndex + 1}/{galleryPhotos.length}
              </Text>
              <ChevronRight size={13} color="#FFFCF7" strokeWidth={2.6} />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Content Body */}
        <View style={styles.mainInfo}>
          {/* Breadcrumb / Category Row */}
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{offer.category.toUpperCase()}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color={Palette.goldInk} style={{ marginRight: 4 }} />
              <Text style={styles.verifiedText}>Verified Upfront Price</Text>
            </View>
          </View>

          {/* Offer Title */}
          <Text style={styles.title}>{offer.title}</Text>

          {/* Venue Byline */}
          <TouchableOpacity
            style={styles.venueRow}
            onPress={() => {
              if (offer.venue_slug) {
                router.push(`/partner/${offer.venue_slug}` as any);
              }
            }}
            activeOpacity={0.75}
          >
            <MapPin size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
            <Text style={styles.venueNameText}>{cleanVenueName}</Text>
            {cleanAddress ? (
              <Text style={styles.venueAreaText}> • {cleanAddress}</Text>
            ) : null}
          </TouchableOpacity>

          {/* Price & Savings Highlight Header Block */}
          <View style={styles.priceHighlightCard}>
            <View style={styles.priceHighlightRow}>
              <View>
                <Text style={styles.priceHighlightLabel}>
                  {partySize === basePartySize && allowsMoreThanTwo
                    ? `From ${partySize} Guests`
                    : `Total for ${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`}
                </Text>
                <View style={styles.priceNumberRow}>
                  <Text style={styles.priceHighlightAmount}>
                    {formatNaira(calculatedTotalKobo)}
                  </Text>
                  {regularTotalKobo > calculatedTotalKobo && (
                    <Text style={styles.regularPriceStrikethrough}>
                      {formatNaira(regularTotalKobo)}
                    </Text>
                  )}
                </View>
              </View>

              {totalSavingsKobo > 0 && (
                <View style={styles.savingsPill}>
                  <Sparkles size={11} color={Palette.mulberry} style={{ marginRight: 4 }} />
                  <Text style={styles.savingsPillText}>
                    Save {formatNaira(totalSavingsKobo)} ({discountPercent}% OFF)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Party Size Selector Card */}
          <View style={styles.partyCard}>
            <View style={styles.partyLeft}>
              <View style={styles.partyIconWrap}>
                <Users size={18} color={Palette.mulberry} />
              </View>
              <View>
                <Text style={styles.partyLabel}>Guests</Text>
                <Text style={styles.partySub}>
                  {partySize === basePartySize
                    ? allowsMoreThanTwo
                      ? `From ${basePartySize} people (up to ${maxPartySize})`
                      : `Package set for ${basePartySize} people`
                    : `${partySize} guests (${partySize - basePartySize} extra)`}
                </Text>
              </View>
            </View>

            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setPartySize((p) => Math.max(basePartySize, p - 1))}
                disabled={partySize <= basePartySize}
                style={[
                  styles.counterBtn,
                  partySize <= basePartySize && styles.counterBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Minus
                  size={16}
                  color={partySize <= basePartySize ? Palette.mutedText : Palette.aubergine}
                />
              </TouchableOpacity>

              <Text style={styles.counterNumber}>{partySize}</Text>

              <TouchableOpacity
                onPress={() => setPartySize((p) => Math.min(maxPartySize, p + 1))}
                disabled={partySize >= maxPartySize}
                style={[
                  styles.counterBtn,
                  partySize >= maxPartySize && styles.counterBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Plus
                  size={16}
                  color={partySize >= maxPartySize ? Palette.mutedText : Palette.aubergine}
                />
              </TouchableOpacity>
            </View>
          </View>

          {maxPartySize > basePartySize && (
            <Text style={styles.partyHint}>
              Each extra guest {formatNaira(extraGuestPrice)} • Maximum {maxPartySize} guests
            </Text>
          )}

          {/* What's Included */}
          <Text style={styles.sectionHeading}>What's Included</Text>
          <View style={styles.inclusionsCard}>
            {inclusionLines.length > 0 ? (
              inclusionLines.map((line, idx) => (
                <View key={idx} style={styles.inclusionItem}>
                  <View style={styles.checkCircle}>
                    <Check size={12} color={Palette.mulberry} strokeWidth={2.8} />
                  </View>
                  <Text style={styles.inclusionText}>{line.trim()}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.inclusionText}>{offer.inclusions}</Text>
            )}
          </View>

          {/* Schedule & Validity */}
          <Text style={styles.sectionHeading}>Schedule & Validity</Text>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCard}>
              <Calendar size={17} color={Palette.mulberry} style={{ marginBottom: 6 }} />
              <Text style={styles.scheduleTitle}>Days Available</Text>
              <Text style={styles.scheduleVal}>
                {(offer as any).days_available || 'Every day (Mon – Sun)'}
              </Text>
            </View>

            <View style={styles.scheduleCard}>
              <Clock size={17} color={Palette.mulberry} style={{ marginBottom: 6 }} />
              <Text style={styles.scheduleTitle}>Hours & Window</Text>
              <Text style={styles.scheduleVal}>
                {(offer as any).time_window || 'Opening hours'}
              </Text>
            </View>
          </View>

          {/* Getting There & Location */}
          <Text style={styles.sectionHeading}>Getting There</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <MapPin size={18} color={Palette.mulberry} style={{ marginRight: 8 }} />
              <Text style={styles.locationTitle}>{cleanVenueName}</Text>
            </View>
            {cleanAddress ? (
              <Text style={styles.locationAddress}>{cleanAddress}</Text>
            ) : null}

            {offer.arrival_notes ? (
              <View style={styles.notesRow}>
                <Info size={14} color={Palette.goldInk} style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.notesText}>{offer.arrival_notes}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleOpenDirections}
              style={styles.directionsBtn}
              activeOpacity={0.8}
            >
              <Navigation size={14} color={Palette.aubergine} style={{ marginRight: 6 }} />
              <Text style={styles.directionsBtnText}>Get Directions on Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Upfront Guarantee Notice */}
          <View style={styles.guaranteeBox}>
            <ShieldCheck size={20} color={Palette.goldInk} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guaranteeTitle}>The Couple Of Offers Promise</Text>
              <Text style={styles.guaranteeText}>
                All tax and service included. Zero unexpected bills at the venue.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar with Savings & "Book Offer" */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.bottomPriceCol}>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomPrice}>{formatNaira(calculatedTotalKobo)}</Text>
            {totalSavingsKobo > 0 && (
              <View style={styles.bottomSavingsBadge}>
                <Text style={styles.bottomSavingsBadgeText}>
                  Save {formatNaira(totalSavingsKobo)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.bottomPriceLabel}>
            {partySize === basePartySize && allowsMoreThanTwo
              ? `From ${partySize} Guests • All-Inclusive`
              : `Total for ${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsBookingModalVisible(true)}
          style={styles.bookButton}
          activeOpacity={0.88}
        >
          <Text style={styles.bookButtonText}>Book Offer</Text>
          <ArrowRight size={16} color={Palette.porcelain} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* BOOKING MODAL (Web Parity: Dropdown Branch & Time, Calendar, Fixed Nav) */}
      {/* ========================================================= */}
      <Modal
        visible={isBookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBookingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            {/* Header / Handle */}
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalDragHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Book Offer</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {offer.title} • {cleanVenueName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsBookingModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <X size={20} color={Palette.aubergine} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Booking Form */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            >
              {/* 1. Branch Selector as Dropdown */}
              {hasMultipleBranches && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Select Branch Location</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsBranchDropdownOpen(!isBranchDropdownOpen);
                      setIsCalendarOpen(false);
                      setIsTimeDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownTrigger,
                      isBranchDropdownOpen && styles.dropdownTriggerActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownLeft}>
                      <Store size={18} color={Palette.mulberry} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownValueText} numberOfLines={1}>
                          {selectedBranchObj?.name.replace(/,\s*Lagos.*$/i, '').trim() ||
                            'Select branch location...'}
                        </Text>
                        {selectedBranchObj?.address && (
                          <Text style={styles.dropdownSubText} numberOfLines={1}>
                            {selectedBranchObj.address.replace(/,\s*Lagos.*$/i, '').trim()}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isBranchDropdownOpen ? (
                      <ChevronUp size={18} color={Palette.aubergine} />
                    ) : (
                      <ChevronDown size={18} color={Palette.aubergine} />
                    )}
                  </TouchableOpacity>

                  {/* Branch Dropdown Menu */}
                  {isBranchDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {branches.map((b) => {
                        const isSelected = selectedBranchId === b.id;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            onPress={() => {
                              setSelectedBranchId(b.id);
                              setIsBranchDropdownOpen(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                style={[
                                  styles.dropdownItemTitle,
                                  isSelected && styles.dropdownItemTitleSelected,
                                ]}
                              >
                                {b.name.replace(/,\s*Lagos.*$/i, '').trim()}
                              </Text>
                              {b.address && (
                                <Text style={styles.dropdownItemSub} numberOfLines={1}>
                                  {b.address.replace(/,\s*Lagos.*$/i, '').trim()}
                                </Text>
                              )}
                            </View>
                            {isSelected && (
                              <Check size={16} color={Palette.mulberry} strokeWidth={2.5} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* 2. Number of Guests */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Number of Guests</Text>
                <View style={styles.partyCard}>
                  <View style={styles.partyLeft}>
                    <View style={styles.partyIconWrap}>
                      <Users size={18} color={Palette.mulberry} />
                    </View>
                    <View>
                      <Text style={styles.partyLabel}>
                        {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
                      </Text>
                      <Text style={styles.partySub}>
                        {partySize === basePartySize
                          ? `Base package includes ${basePartySize} guests`
                          : `${partySize - basePartySize} extra guest(s) (+${formatNaira((partySize - basePartySize) * extraGuestPrice)})`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      onPress={() => setPartySize((p) => Math.max(basePartySize, p - 1))}
                      disabled={partySize <= basePartySize}
                      style={[
                        styles.counterBtn,
                        partySize <= basePartySize && styles.counterBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Minus
                        size={16}
                        color={partySize <= basePartySize ? Palette.mutedText : Palette.aubergine}
                      />
                    </TouchableOpacity>

                    <Text style={styles.counterNumber}>{partySize}</Text>

                    <TouchableOpacity
                      onPress={() => setPartySize((p) => Math.min(maxPartySize, p + 1))}
                      disabled={partySize >= maxPartySize}
                      style={[
                        styles.counterBtn,
                        partySize >= maxPartySize && styles.counterBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Plus
                        size={16}
                        color={partySize >= maxPartySize ? Palette.mutedText : Palette.aubergine}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {allowsMoreThanTwo && (
                  <Text style={styles.guestHintText}>
                    Each extra guest {formatNaira(extraGuestPrice)} • Max {maxPartySize} guests
                  </Text>
                )}
              </View>

              {/* 3. Arrival Date (Calendar opens on select) */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Arrival Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsCalendarOpen(!isCalendarOpen);
                    setIsTimeDropdownOpen(false);
                    setIsBranchDropdownOpen(false);
                  }}
                  style={[
                    styles.dropdownTrigger,
                    isCalendarOpen && styles.dropdownTriggerActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeft}>
                    <Calendar size={18} color={Palette.mulberry} style={{ marginRight: 10 }} />
                    <Text style={styles.dropdownValueText}>
                      {selectedDate ? formatDisplayDate(selectedDate) : 'Select arrival date...'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.changePill}>
                      <Text style={styles.changePillText}>{isCalendarOpen ? 'Hide' : 'Change'}</Text>
                    </View>
                    {isCalendarOpen ? (
                      <ChevronUp size={16} color={Palette.aubergine} />
                    ) : (
                      <ChevronDown size={16} color={Palette.aubergine} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Interactive Month Calendar */}
                {isCalendarOpen && (
                  <View style={styles.calendarCard}>
                    {/* Month Navigation Bar */}
                    <View style={styles.calMonthNav}>
                      <TouchableOpacity
                        onPress={handlePrevMonth}
                        disabled={!canGoPrevMonth}
                        style={[styles.calNavBtn, !canGoPrevMonth && { opacity: 0.25 }]}
                        hitSlop={8}
                      >
                        <ChevronLeft size={16} color={Palette.aubergine} />
                      </TouchableOpacity>
                      <Text style={styles.calMonthTitle}>{calMonthName}</Text>
                      <TouchableOpacity
                        onPress={handleNextMonth}
                        style={styles.calNavBtn}
                        hitSlop={8}
                      >
                        <ChevronRight size={16} color={Palette.aubergine} />
                      </TouchableOpacity>
                    </View>

                    {/* Weekday headers */}
                    <View style={styles.calWeekdaysRow}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((wd) => (
                        <Text key={wd} style={styles.calWeekdayText}>
                          {wd}
                        </Text>
                      ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.calDaysGrid}>
                      {Array.from({ length: leadingBlanks }).map((_, i) => (
                        <View key={`blank-${i}`} style={styles.calDayCell} />
                      ))}

                      {Array.from({ length: daysInCalMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayStr = String(dayNum).padStart(2, '0');
                        const monthStr = String(calMonth + 1).padStart(2, '0');
                        const dateKey = `${calYear}-${monthStr}-${dayStr}`;

                        const isPast = dateKey < todayStr;
                        const isSelected = dateKey === selectedDate;
                        const hasSlots = Boolean(slotsByDate[dateKey]?.length > 0);
                        const isDisabled = isPast || !hasSlots;

                        return (
                          <TouchableOpacity
                            key={dateKey}
                            disabled={isDisabled}
                            onPress={() => handleSelectDate(dateKey)}
                            style={[
                              styles.calDayCell,
                              isSelected && styles.calDayCellSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.calDayText,
                                isSelected && styles.calDayTextSelected,
                                isDisabled && styles.calDayTextDisabled,
                              ]}
                            >
                              {dayNum}
                            </Text>
                            {hasSlots && !isDisabled && !isSelected && (
                              <View style={styles.calDayDot} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Arrival Time (Compact Dropdown) */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Arrival Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!selectedDate) {
                      setIsCalendarOpen(true);
                    } else {
                      setIsTimeDropdownOpen(!isTimeDropdownOpen);
                      setIsBranchDropdownOpen(false);
                      setIsCalendarOpen(false);
                    }
                  }}
                  style={[
                    styles.dropdownTrigger,
                    isTimeDropdownOpen && styles.dropdownTriggerActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeft}>
                    <Clock size={18} color={Palette.mulberry} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.dropdownValueText}>
                        {currentSelectedSlot
                          ? (() => {
                              const timeStr = formatSlotTime(currentSelectedSlot.starts_at);
                              const remaining =
                                typeof currentSelectedSlot.remaining_units === 'number' && !isNaN(currentSelectedSlot.remaining_units)
                                  ? currentSelectedSlot.remaining_units
                                  : typeof (currentSelectedSlot as any).available === 'number' && !isNaN((currentSelectedSlot as any).available)
                                  ? (currentSelectedSlot as any).available
                                  : null;
                              return remaining != null ? `${timeStr} (${remaining} spots left)` : timeStr;
                            })()
                          : selectedDate
                          ? 'Choose arrival time...'
                          : 'Select arrival date first'}
                      </Text>
                    </View>
                  </View>
                  {isTimeDropdownOpen ? (
                    <ChevronUp size={18} color={Palette.aubergine} />
                  ) : (
                    <ChevronDown size={18} color={Palette.aubergine} />
                  )}
                </TouchableOpacity>

                {/* Compact Time Dropdown Menu */}
                {isTimeDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {availableSlotsForDate.length > 0 ? (
                      availableSlotsForDate.map((slot) => {
                        const isSlotSelected = selectedSlot === slot.id;
                        const spotsCount =
                          typeof slot.remaining_units === 'number' && !isNaN(slot.remaining_units)
                            ? slot.remaining_units
                            : typeof (slot as any).available === 'number' && !isNaN((slot as any).available)
                            ? (slot as any).available
                            : 4;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            onPress={() => {
                              setSelectedSlot(slot.id);
                              setIsTimeDropdownOpen(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              isSlotSelected && styles.dropdownItemSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Clock
                                size={15}
                                color={isSlotSelected ? Palette.mulberry : Palette.mutedText}
                              />
                              <Text
                                style={[
                                  styles.dropdownItemTitle,
                                  isSlotSelected && styles.dropdownItemTitleSelected,
                                ]}
                              >
                                {formatSlotTime(slot.starts_at)}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.spotsPill,
                                isSlotSelected && styles.spotsPillSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.spotsPillText,
                                  isSlotSelected && styles.spotsPillTextSelected,
                                ]}
                              >
                                {spotsCount} spots left
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.dropdownEmpty}>
                        <Text style={styles.dropdownEmptyText}>
                          No arrival slots available on this date.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* 5. Receipt Email (Prepopulated and disabled for editing if user is logged in) */}
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.modalSectionLabel, { marginBottom: 0 }]}>
                    Receipt & Voucher Email
                  </Text>
                  {Boolean(authUser?.email) && (
                    <View style={styles.verifiedBadgeRow}>
                      <ShieldCheck size={12} color={Palette.goldInk} />
                      <Text style={styles.verifiedBadgeText}>Verified Account</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.inputWrap,
                    Boolean(authUser?.email) && styles.inputWrapDisabled,
                  ]}
                >
                  <Mail
                    size={16}
                    color={Boolean(authUser?.email) ? Palette.mutedText : Palette.mulberry}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={[
                      styles.emailInput,
                      Boolean(authUser?.email) && styles.emailInputDisabled,
                    ]}
                    placeholder="Enter your email address"
                    placeholderTextColor={Palette.mutedText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authUser?.email || email}
                    editable={!authUser?.email}
                    onChangeText={setEmail}
                  />
                  {Boolean(authUser?.email) && (
                    <Lock size={13} color={Palette.mutedText} style={{ marginLeft: 6 }} />
                  )}
                </View>
                <Text style={styles.inputHelperText}>
                  {Boolean(authUser?.email)
                    ? 'Your 4-digit arrival check-in PIN and booking confirmation will be sent to your account email.'
                    : 'Your 4-digit arrival check-in PIN and booking confirmation will be sent here.'}
                </Text>
              </View>

              {/* Security Reassurance */}
              <View style={styles.appleNoticeBox}>
                <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
                <Text style={styles.appleNoticeText}>
                  Secure payment powered by Bachs. Instant confirmation & 4-digit arrival code.
                </Text>
              </View>
            </ScrollView>

            {/* 6. Fixed Bottom Navigation Bar inside Booking Modal */}
            <View
              style={[
                styles.modalFixedBottomBar,
                { paddingBottom: Math.max(insets.bottom, 14) },
              ]}
            >
              <View style={styles.modalFixedPriceCol}>
                <View style={styles.bottomPriceRow}>
                  <Text style={styles.modalFixedPrice}>
                    {formatNaira(calculatedTotalKobo)}
                  </Text>
                  {totalSavingsKobo > 0 && (
                    <View style={styles.bottomSavingsBadge}>
                      <Text style={styles.bottomSavingsBadgeText}>
                        Save {formatNaira(totalSavingsKobo)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modalFixedPriceSub}>
                  {partySize === basePartySize && allowsMoreThanTwo
                    ? `From ${partySize} Guests • All-Inclusive`
                    : `Total for ${partySize} ${partySize === 1 ? 'Guest' : 'Guests'} • All-Inclusive`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleProceedToExternalCheckout}
                disabled={isSubmitting}
                style={[
                  styles.continuePaymentBtn,
                  isSubmitting && { opacity: 0.7 },
                ]}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={Palette.porcelain} />
                    <Text style={styles.continuePaymentBtnText}>Preparing...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.continuePaymentBtnText}>Continue to Payment</Text>
                    <ArrowRight size={16} color={Palette.porcelain} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Palette.mutedText,
    fontFamily: 'System',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: 195,
    backgroundColor: Palette.aubergine,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 195,
  },
  floatingControls: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  photoCountPill: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(48, 29, 50, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    color: '#FFFCF7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainInfo: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: 'rgba(116, 61, 96, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: Palette.mulberry,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 201, 154, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: Palette.goldInk,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    lineHeight: 28,
    marginBottom: 8,
    fontFamily: 'System',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  venueNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.mulberry,
    textDecorationLine: 'underline',
  },
  venueAreaText: {
    fontSize: 14,
    color: Palette.mutedText,
  },
  priceHighlightCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 14,
  },
  priceHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceHighlightLabel: {
    fontSize: 11,
    color: Palette.mutedText,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceHighlightAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
  },
  regularPriceStrikethrough: {
    fontSize: 14,
    color: Palette.mutedText,
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.15)',
  },
  savingsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.mulberry,
  },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  partyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(116, 61, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  partySub: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 1,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.35,
  },
  counterNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    minWidth: 20,
    textAlign: 'center',
  },
  partyHint: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inclusionsCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    gap: 12,
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  inclusionText: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
    lineHeight: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
  },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scheduleVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  locationCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  locationAddress: {
    fontSize: 13,
    color: Palette.mutedText,
    marginBottom: 10,
    lineHeight: 18,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(229, 201, 154, 0.22)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: Palette.goldInk,
    lineHeight: 17,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(48, 29, 50, 0.06)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  slotDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  slotTimeText: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
  },
  unitBadge: {
    backgroundColor: 'rgba(48, 29, 50, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedUnitBadge: {
    backgroundColor: Palette.mulberry,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  selectedUnitBadgeText: {
    color: '#FFFCF7',
  },
  selectedSlotText: {
    color: Palette.mulberry,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 201, 154, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(229, 201, 154, 0.5)',
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.goldInk,
    marginBottom: 2,
  },
  guaranteeText: {
    fontSize: 12,
    color: Palette.aubergine,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.5,
  },
  bottomSavingsBadge: {
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bottomSavingsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.mulberry,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: Palette.mutedText,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  bookButton: {
    flexDirection: 'row',
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '800',
  },

  /* Modal Sheet Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 12, 26, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  modalDragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: Palette.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(48, 29, 50, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 24,
    backgroundColor: Palette.porcelain,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 8,
  },

  /* Dropdown Styles (Branch, Date, Time) */
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownTriggerActive: {
    borderColor: Palette.mulberry,
    backgroundColor: '#FFFFFF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  dropdownSubText: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    borderRadius: 14,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF5ED',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(116, 61, 96, 0.07)',
  },
  dropdownItemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  dropdownItemTitleSelected: {
    fontWeight: '800',
    color: Palette.mulberry,
  },
  dropdownItemSub: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 1,
  },
  spotsPill: {
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  spotsPillSelected: {
    backgroundColor: Palette.mulberry,
  },
  spotsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  spotsPillTextSelected: {
    color: '#FFFFFF',
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12.5,
    color: Palette.mutedText,
    textAlign: 'center',
  },

  /* Calendar Card Styles */
  changePill: {
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    marginTop: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  calMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: '#E8DBC6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  calWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF5ED',
    paddingBottom: 6,
  },
  calWeekdayText: {
    width: (SCREEN_WIDTH - 80) / 7,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mutedText,
    textTransform: 'uppercase',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: (SCREEN_WIDTH - 80) / 7,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    position: 'relative',
    marginVertical: 2,
  },
  calDayCellSelected: {
    backgroundColor: Palette.mulberry,
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calDayTextDisabled: {
    color: '#D1C7B7',
  },
  calDayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.mulberry,
  },
  guestHintText: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 6,
    paddingHorizontal: 2,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(228, 187, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.goldInk,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapDisabled: {
    backgroundColor: '#F7F2EC',
    borderColor: '#E8DBC6',
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
    padding: 0,
  },
  emailInputDisabled: {
    color: Palette.aubergine,
    fontWeight: '600',
  },
  inputHelperText: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 5,
    lineHeight: 15,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DBC6',
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    color: Palette.mutedText,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  breakdownStrikethrough: {
    fontSize: 12,
    color: Palette.mutedText,
    textDecorationLine: 'line-through',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E8DBC6',
    marginVertical: 10,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  breakdownTotalVal: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  appleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: 'rgba(228, 187, 129, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  appleNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#8F662A',
    fontWeight: '600',
    lineHeight: 15,
  },

  /* Fixed Bottom Nav in Modal */
  modalFixedBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8DBC6',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  modalFixedPriceCol: {
    flex: 1,
  },
  modalFixedPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.3,
  },
  modalFixedPriceSub: {
    fontSize: 11,
    color: Palette.mutedText,
    fontWeight: '600',
    marginTop: 2,
  },
  continuePaymentBtn: {
    backgroundColor: Palette.mulberry,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  continuePaymentBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.porcelain,
    letterSpacing: -0.2,
  },
});
