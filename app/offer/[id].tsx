import { CatalogImage } from '../../components/CatalogImage';
import { BrandLoader } from '../../components/BrandLoader';
import { priceForParty } from '../../utils/pricing';
import { DataState } from '../../components/DataState';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  ArrowRight,
  Store,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { formatNaira} from '../../constants/config';

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
  const routeParams = useLocalSearchParams<{
    id: string;
    intent?: string;
    slotId?: string;
    partySize?: string;
  }>();
  const id = routeParams.id;
  const router = useRouter();
  const toggleSave = useSavedStore((state) => state.toggleSave);
  const isThisOfferSaved = useSavedStore((state) => (id ? state.savedOffers.some((o) => o.id === id) : false));
  const insets = useSafeAreaInsets();

  const authUser = useAuthStore((s) => s.user);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [partyChoice, setPartyChoice] = useState<{ offerId: string; size: number } | null>(null);
  const [email, setEmail] = useState<string>(authUser?.email || '');
  const [bookingMessage, setBookingMessage] = useState('');
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isAskToPayModalVisible, setIsAskToPayModalVisible] = useState(false);
  const [askRequesterName, setAskRequesterName] = useState(authUser?.name || '');
  const [askRequesterPhone, setAskRequesterPhone] = useState('');
  const [createdPaymentLink, setCreatedPaymentLink] = useState<string | null>(null);
  const [paymentRequestBusy, setPaymentRequestBusy] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isEnquiryModalVisible, setIsEnquiryModalVisible] = useState(false);
  const [enquiryName, setEnquiryName] = useState(authUser?.name || '');
  const [enquiryEmail, setEnquiryEmail] = useState(authUser?.email || '');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquiryBusy, setEnquiryBusy] = useState(false);
  const [enquiryError, setEnquiryError] = useState('');
  const [enquirySent, setEnquirySent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payForSomeone, setPayForSomeone] = useState(false);
  const [payerName, setPayerName] = useState(authUser?.name || '');
  const [payerEmail, setPayerEmail] = useState(authUser?.email || '');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');

  // Web-parity dropdown and calendar picker states
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Auto-resume booking flow when returning from login
  useEffect(() => {
    if (routeParams.intent === 'RESUME_BOOKING') {
      if (routeParams.slotId) setSelectedSlot(routeParams.slotId);
      if (routeParams.partySize && id) {
        setPartyChoice({ offerId: id, size: Number(routeParams.partySize) });
      }
      setIsBookingModalVisible(true);
    }
  }, [routeParams.intent, routeParams.slotId, routeParams.partySize, id]);

  useEffect(() => {
    if (authUser?.name && !askRequesterName) {
      setAskRequesterName(authUser.name);
    }
  }, [authUser?.name, askRequesterName]);

  useEffect(() => {
    if (authUser?.email && !email) {
      setEmail(authUser.email);
    }
  }, [authUser?.email]);

  const { data: offer, isLoading, refetch } = useQuery<ExtendedOffer>({
    queryKey: ['offer', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing ID');
      const live = await catalogService.getOfferById(id);
      return live as ExtendedOffer;
    },
  });

  const basePartySize = offer?.party_size || 2;
  const maxPartySize = offer?.max_party_size ?? basePartySize;
  const partySize = partyChoice?.offerId === offer?.id
    ? Math.max(basePartySize, Math.min(maxPartySize, partyChoice?.size ?? basePartySize))
    : basePartySize;
  const setPartySize = (update: (current: number) => number) => {
    if (offer) setPartyChoice({ offerId: offer.id, size: update(partySize) });
  };
  const extraGuestPrice = offer?.extra_friend_price_kobo ?? 0;
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

  const allSlots = useMemo<Slot[]>(() => offer?.slots || [], [offer?.slots]);

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

  // Initialize branch selection from the selected catalogue entry.
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(offer?.venue_id || branches[0].id);
    }
  }, [offer, branches, selectedBranchId]);

  useEffect(() => {
    if (!selectedDate && firstAvailableDate) {
      setSelectedDate(firstAvailableDate);
      // Do NOT auto-select a slot — the user must consciously pick their arrival time
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

  const saved = isThisOfferSaved;

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
    if (!offer) return [null];
    const list: string[] = [];
    if (offer.gallery && offer.gallery.length > 0) {
      offer.gallery.forEach((url) => {
        if (url) list.push(url);
      });
    } else if (offer.image_url) {
      list.push(offer.image_url);
    }
    return list.length > 0 ? list : [null];
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
        .replace(/,\s*Lagos/gi, '')
      .replace(/Lagos/gi, '')
      .trim() || 'Curated Venue';
  }, [offer]);

  const cleanAddress = useMemo(() => {
    if (!offer?.street_address) return '';
    return offer.street_address
      .replace(/,\s*Lagos/gi, '')
      .replace(/Lagos/gi, '')
      .replace(/,\s*Nigeria/gi, '')
      .trim();
  }, [offer]);

  const quote = offer ? priceForParty(offer, partySize) : null;
  const calculatedTotalKobo = quote?.totalKobo ?? 0;
  const regularTotalKobo = quote?.regularTotalKobo ?? 0;
  const totalSavingsKobo = quote?.savingsKobo ?? 0;
  const discountPercent = quote?.discountPercent ?? 0;

  const handleShare = () => {
    setIsShareModalVisible(true);
  };

  const shareExperience = async (withPricing: boolean) => {
    if (!offer) return;
    const slug = encodeURIComponent(offer.slug || offer.id);
    const url = withPricing
      ? `https://coupleofoffers.com/offers/${slug}`
      : `https://coupleofoffers.com/share/offer/${slug}`;
    const description = withPricing
      ? 'Found something special for us? See the full experience, price, and availability.'
      : 'I found a date idea you’ll love. Explore the experience and venue.';
    try {
      setIsShareModalVisible(false);
      const title = withPricing ? `Book this experience: ${offer.title}` : `A date idea: ${offer.title}`;
      const content = Platform.OS === 'ios'
        ? { title, message: description, url }
        : { title, message: `${description}\n\n${url}` };
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      await Share.share(content);
    } catch (error) {
      Alert.alert('Unable to share', error instanceof Error ? error.message : 'Please try again.');
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

    if (!selectedDate) {
      Alert.alert('Select Arrival Date', 'Please pick your arrival date before proceeding.');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Select Arrival Time', 'Please pick your arrival time slot before proceeding.');
      return;
    }

    // Verify the selected slot is still valid for the chosen date
    const slotsForSelectedDate = slotsByDate[selectedDate] || [];
    const isSlotStillValid = slotsForSelectedDate.some((s) => s.id === selectedSlot);
    if (!isSlotStillValid) {
      Alert.alert('Time Slot Unavailable', 'The selected time slot is no longer available. Please pick another time.');
      return;
    }

    let bookingRecipientEmail = '';
    let effectivePayerEmail = '';
    let effectivePayerName = '';

    if (payForSomeone) {
      bookingRecipientEmail = email.trim();
      if (!bookingRecipientEmail || !bookingRecipientEmail.includes('@') || !bookingRecipientEmail.includes('.')) {
        Alert.alert(
          'Guest Email Required',
          'Please enter the guest’s email address where their booking confirmation and check-in PIN can be delivered.'
        );
        return;
      }
      effectivePayerEmail = (authUser?.email || payerEmail).trim();
      if (!effectivePayerEmail || !effectivePayerEmail.includes('@') || !effectivePayerEmail.includes('.')) {
        Alert.alert(
          'Payer Email Required',
          'Please enter your email address as the payer so you receive payment receipts and updates.'
        );
        return;
      }
      effectivePayerName = (authUser?.name || payerName).trim();
      if (!effectivePayerName) {
        Alert.alert('Payer Name Required', 'Please enter your name as the payer.');
        return;
      }
    } else {
      bookingRecipientEmail = (authUser?.email || email).trim();
      if (!bookingRecipientEmail || !bookingRecipientEmail.includes('@') || !bookingRecipientEmail.includes('.')) {
        Alert.alert(
          'Email Required',
          'Please enter a valid email address where your booking confirmation and 4-digit check-in PIN can be delivered.'
        );
        return;
      }
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
        email: bookingRecipientEmail,
        payerEmail: payForSomeone ? effectivePayerEmail : undefined,
        payerName: payForSomeone ? effectivePayerName : undefined,
        beneficiaryPhone: payForSomeone && beneficiaryPhone.trim() ? beneficiaryPhone.trim() : undefined,
        bookingMessage: bookingMessage.trim(),
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
          reference: res.reference,
          offerId: offer?.id || id || '',
          slotId: selectedSlot,
          partySize: partySize.toString(),
          amountKobo: calculatedTotalKobo.toString(),
          email: bookingRecipientEmail,
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

  const handleSubmitEnquiry = async () => {
    if (!offer || enquiryMessage.trim().length < 5 || !/^\S+@\S+\.\S+$/.test(enquiryEmail.trim())) {
      setEnquiryError(enquiryMessage.trim().length < 5 ? 'Please enter a question of at least 5 characters.' : 'Enter a valid email so the partner can reply.');
      return;
    }
    setEnquiryBusy(true);
    setEnquiryError('');
    try {
      await checkoutService.sendOfferEnquiry({ offerId: offer.id, name: enquiryName.trim(), email: enquiryEmail.trim(), message: enquiryMessage.trim() });
      setEnquirySent(true);
      setEnquiryMessage('');
    } catch (error) {
      setEnquiryError(error instanceof Error ? error.message : 'Could not send your question.');
    } finally {
      setEnquiryBusy(false);
    }
  };

  const handlePayForMe = () => {
    if (!offer || !selectedDate || !selectedSlot) {
      Alert.alert('Select arrival time', 'Please choose an arrival date and time first.');
      return;
    }
    const slotObj = allSlots.find(s => s.id === selectedSlot);
    router.push({ pathname: '/pay-for', params: { offerId: offer.id, slotId: selectedSlot, partySize: String(partySize), amountKobo: String(calculatedTotalKobo), offerTitle: offer.title, venueName: cleanVenueName, slotTime: slotObj?.starts_at || '', bookingMessage: bookingMessage.trim() } });
    setIsBookingModalVisible(false);
  };

  const handleAskSomeoneToPay = async () => {
    if (!offer || !selectedDate || !selectedSlot) {
      Alert.alert('Select arrival time', 'Choose a date and time first so the request contains the exact booking details.');
      return;
    }
    const cleanName = (askRequesterName.trim() || authUser?.name || '').trim();
    if (!cleanName) {
      Alert.alert('Your Name Required', 'Please enter your name so the recipient knows who created this request.');
      return;
    }
    setPaymentRequestBusy(true);
    try {
      const request = await checkoutService.createPaymentRequest({
        offerId: offer.id,
        slotId: selectedSlot,
        partySize,
        requesterName: cleanName,
        requesterPhone: askRequesterPhone.trim() || undefined,
        requesterEmail: authUser?.email || undefined,
      });
      const link = `https://coupleofoffers.com/pay-for?token=${encodeURIComponent(request.token)}`;
      setCreatedPaymentLink(link);
      const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
      await Share.share({
        title: `Payment request for ${offer.title}`,
        message: `Hi! I found an experience I'd love to share with you. Could you help cover this booking? This request is for ${offer.title} at ${cleanVenueName}, on ${formattedDate}, for ${partySize} ${partySize === 1 ? 'guest' : 'guests'}. Here is the link:\n\n${link}`,
      });
    } catch (error) {
      Alert.alert('Could not create payment request', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPaymentRequestBusy(false);
    }
  };

  const handleAskToPayFromBottomBar = () => {
    setIsAskToPayModalVisible(true);
  };

  if (!isLoading && !offer) {
    return <DataState message="Unable to load this offer." onRetry={() => { void refetch(); }} />;
  }

  if (isLoading || !offer) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLoader size="large" color={Palette.mulberry} />
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
              <CatalogImage key={idx} url={photoUri} category={offer.category} style={styles.galleryImage} iconSize={104} />
            ))}
          </ScrollView>

          {/* Floating Top Controls (Share, Save) */}
          <View style={styles.floatingControls}>
            <View style={styles.rightIcons}>
              <TouchableOpacity
                onPress={() => setIsShareModalVisible(true)}
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
                  color={Palette.saved}
                  fill={saved ? Palette.saved : 'transparent'}
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
            accessibilityRole="link"
            accessibilityLabel={`View ${cleanVenueName} restaurant page`}
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
                  <Text style={styles.savingsPillText}>
                    Save {formatNaira(totalSavingsKobo)} ({discountPercent}% OFF)
                  </Text>
                </View>
              )}
            </View>
            {allowsMoreThanTwo && <Text style={{ marginTop: 10, fontSize: 12, color: Palette.mulberry }}>
              Each extra guest pays {formatNaira(extraGuestPrice)}{(offer.regular_extra_guest_kobo ?? 0) > extraGuestPrice ? ` (usually ${formatNaira(offer.regular_extra_guest_kobo)})` : ''}. Total and savings update as you add guests.
            </Text>}
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
          {offer.short_description ? (
            <Text style={styles.shortDescription}>{offer.short_description}</Text>
          ) : null}
          <Text style={styles.sectionHeading}>What&apos;s Included</Text>
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

          <View style={styles.venuePreviewCard}>
            <View style={styles.venuePreviewBody}>
              <CatalogImage url={offer.venue_banner_url || offer.image_url} category={offer.category} style={styles.venuePreviewImage} iconSize={24} />
              <View style={styles.venuePreviewCopy}>
                <Text style={styles.venuePreviewEyebrow}>ABOUT THE RESTAURANT</Text>
                <Text style={styles.venuePreviewName} numberOfLines={1}>{cleanVenueName}</Text>
                <Text style={styles.venuePreviewAddress} numberOfLines={2}>{cleanAddress || 'Verified Couple Of Offers partner venue'}</Text>
              </View>
            </View>
            {offer.arrival_notes ? <Text style={styles.venuePreviewNotes}>{offer.arrival_notes}</Text> : null}
            <View style={styles.venuePreviewActions}>
              <TouchableOpacity style={styles.venuePreviewLink} onPress={() => offer.venue_slug && router.push(`/partner/${offer.venue_slug}` as any)} activeOpacity={0.8}>
                <Text style={styles.venuePreviewLinkText}>Learn more about this restaurant</Text><ChevronRight size={16} color={Palette.mulberry} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.venueDirectionsLink} onPress={handleOpenDirections} activeOpacity={0.8}><Navigation size={14} color={Palette.mulberry}/><Text style={styles.venuePreviewLinkText}>Directions</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.enquiryButton} onPress={() => { setEnquiryError(''); setEnquirySent(false); setIsEnquiryModalVisible(true); }} activeOpacity={0.85}>
            <Mail size={16} color={Palette.mulberry} />
            <Text style={styles.enquiryButtonText}>Ask {cleanVenueName} a question</Text>
          </TouchableOpacity>

          {/* Getting There & Location */}

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

      {/* Sticky Bottom Booking Bar with "Ask to pay" and "Book offer" */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <TouchableOpacity
          onPress={handleAskToPayFromBottomBar}
          style={styles.bottomAskToPayBtn}
          activeOpacity={0.82}
          accessibilityLabel="Ask someone to pay for this offer"
        >
          <Share2 size={15} color={Palette.mulberry} />
          <Text style={styles.bottomAskToPayText} numberOfLines={1}>
            Ask someone to pay
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSelectedSlot(null);
            setIsBookingModalVisible(true);
          }}
          style={styles.bottomBookButton}
          activeOpacity={0.88}
        >
          <View style={styles.bottomBookContent}>
            <View style={styles.bottomBookMainRow}>
              <Text style={styles.bottomBookTitle}>Book offer</Text>
              <Text style={styles.bottomBookPrice}>{formatNaira(calculatedTotalKobo)}</Text>
            </View>
            <View style={styles.bottomBookSubRow}>
              <Text style={styles.bottomBookParty}>
                {partySize === 2 ? 'For two' : `${partySize} guests`}
              </Text>
              {totalSavingsKobo > 0 ? (
                <View style={styles.bottomBookSavingsTag}>
                  <Text style={styles.bottomBookSavingsText}>
                    Save {formatNaira(totalSavingsKobo)}
                  </Text>
                </View>
              ) : (
                <View style={styles.bottomBookSavingsTag}>
                  <Text style={styles.bottomBookSavingsText}>All-inclusive</Text>
                </View>
              )}
            </View>
          </View>
          <ArrowRight size={16} color={Palette.porcelain} style={styles.bottomBookArrow} />
        </TouchableOpacity>
      </View>

      <Modal visible={isShareModalVisible} transparent animationType="fade" onRequestClose={() => setIsShareModalVisible(false)}>
        <View style={styles.shareOverlay}>
          <View style={styles.shareSheet}>
            <Text style={styles.shareEyebrow}>SHARE A DATE IDEA</Text>
            <Text style={styles.shareTitle}>How would you like to share it?</Text>
            <TouchableOpacity style={styles.shareOption} onPress={() => { void shareExperience(true); }}>
              <Share2 size={20} color={Palette.mulberry} />
              <View style={styles.shareOptionCopy}><Text style={styles.shareOptionTitle}>Share with pricing</Text><Text style={styles.shareOptionDescription}>Found something special for us? See the full experience, price, and availability.</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={() => { void shareExperience(false); }}>
              <Share2 size={20} color={Palette.mulberry} />
              <View style={styles.shareOptionCopy}><Text style={styles.shareOptionTitle}>Share without pricing</Text><Text style={styles.shareOptionDescription}>I found a date idea you’ll love. Explore the experience and venue.</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareCancel} onPress={() => setIsShareModalVisible(false)}><Text style={styles.shareCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                              if (b.offer_id !== offer.id) {
                                setSelectedSlot(null);
                                setSelectedDate('');
                                router.replace(`/offer/${b.offer_id}`);
                              }
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
                            : 0;
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

              {/* 5. Receipt Email */}
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.modalSectionLabel, { marginBottom: 0 }]}>
                    {payForSomeone ? 'Guest’s Receipt Email' : 'Receipt & Voucher Email'}
                  </Text>
                  {!payForSomeone && Boolean(authUser?.email) && (
                    <View style={styles.verifiedBadgeRow}>
                      <ShieldCheck size={12} color={Palette.goldInk} />
                      <Text style={styles.verifiedBadgeText}>Verified Account</Text>
                    </View>
                  )}
                  {!payForSomeone && !authUser?.email && (
                    <TouchableOpacity
                      onPress={() => {
                        setIsBookingModalVisible(false);
                        router.push({
                          pathname: '/login',
                          params: {
                            returnTo: `/offer/${id}`,
                            intent: 'RESUME_BOOKING',
                            slotId: selectedSlot || '',
                            partySize: String(partySize),
                          },
                        });
                      }}
                      hitSlop={6}
                    >
                      <Text style={{ fontSize: 11.5, color: Palette.mulberry, fontWeight: '700' }}>
                        Sign in
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View
                  style={[
                    styles.inputWrap,
                    !payForSomeone && Boolean(authUser?.email) && styles.inputWrapDisabled,
                  ]}
                >
                  <Mail
                    size={15}
                    color={!payForSomeone && Boolean(authUser?.email) ? Palette.mutedText : Palette.mulberry}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={[
                      styles.emailInput,
                      !payForSomeone && Boolean(authUser?.email) && styles.emailInputDisabled,
                    ]}
                    placeholder={payForSomeone ? "guest@example.com" : "Enter your email address"}
                    placeholderTextColor={Palette.mutedText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={!payForSomeone && authUser?.email ? authUser.email : email}
                    editable={payForSomeone || !authUser?.email}
                    onChangeText={setEmail}
                  />
                  {!payForSomeone && Boolean(authUser?.email) && (
                    <Lock size={13} color={Palette.mutedText} style={{ marginLeft: 6 }} />
                  )}
                </View>
                <Text style={styles.inputHelperText}>
                  {payForSomeone
                    ? 'Booking details and the 4-digit check-in PIN will be sent to the guest.'
                    : Boolean(authUser?.email)
                    ? 'Your 4-digit arrival check-in PIN will be sent to your account email.'
                    : 'Your 4-digit arrival check-in PIN will be sent here.'}
                </Text>

                {/* "I'm paying for someone else" Checkbox / Toggle */}
                <TouchableOpacity
                  style={[
                    styles.payForSomeoneCard,
                    payForSomeone && styles.payForSomeoneCardActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    const next = !payForSomeone;
                    setPayForSomeone(next);
                    if (next) {
                      setEmail('');
                    } else {
                      setEmail(authUser?.email || '');
                    }
                  }}
                >
                  <View style={[styles.checkboxBox, payForSomeone && styles.checkboxBoxActive]}>
                    {payForSomeone && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payForSomeoneTitle}>I’m paying for someone else</Text>
                    <Text style={styles.payForSomeoneSub}>The guest owns the booking; you receive payment updates.</Text>
                  </View>
                </TouchableOpacity>

                {/* Payer details if paying for someone else */}
                {payForSomeone && (
                  <View style={styles.payerDetailsCard}>
                    <Text style={styles.payerDetailsNotice}>
                      {authUser?.email
                        ? `You will pay as ${authUser.name || authUser.email} (${authUser.email}).`
                        : 'Enter your details as the payer. The guest above remains the booking owner.'}
                    </Text>

                    {!authUser?.email && (
                      <>
                        <Text style={styles.payerInputLabel}>Your Name</Text>
                        <View style={styles.inputWrap}>
                          <TextInput
                            style={styles.emailInput}
                            placeholder="Your full name"
                            placeholderTextColor={Palette.mutedText}
                            value={payerName}
                            onChangeText={setPayerName}
                          />
                        </View>

                        <Text style={styles.payerInputLabel}>Your Email</Text>
                        <View style={styles.inputWrap}>
                          <TextInput
                            style={styles.emailInput}
                            placeholder="you@example.com"
                            placeholderTextColor={Palette.mutedText}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={payerEmail}
                            onChangeText={setPayerEmail}
                          />
                        </View>
                      </>
                    )}

                    <Text style={styles.payerInputLabel}>Guest Phone <Text style={{ fontWeight: '400', color: Palette.mutedText }}>(optional)</Text></Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.emailInput}
                        placeholder="+234 800 000 0000"
                        placeholderTextColor={Palette.mutedText}
                        keyboardType="phone-pad"
                        value={beneficiaryPhone}
                        onChangeText={setBeneficiaryPhone}
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Message to {cleanVenueName} <Text style={{ color: Palette.mutedText, fontWeight: '400' }}>(optional)</Text></Text>
                <TextInput
                  value={bookingMessage}
                  onChangeText={setBookingMessage}
                  maxLength={500}
                  multiline
                  textAlignVertical="top"
                  placeholder="Share a short note about allergies, dietary needs, or special instructions."
                  placeholderTextColor={Palette.mutedText}
                  style={styles.bookingMessageInput}
                />
                <Text style={styles.inputHelperText}>Shared with the partner after your booking is confirmed. {bookingMessage.length}/500</Text>
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
              <TouchableOpacity
                onPress={handleProceedToExternalCheckout}
                disabled={isSubmitting}
                style={[
                  styles.modalContinueButton,
                  isSubmitting && { opacity: 0.7 },
                  (!selectedDate || !selectedSlot) && { opacity: 0.55 },
                ]}
                activeOpacity={0.88}
              >
                <View style={styles.bottomBookContent}>
                  <View style={styles.bottomBookMainRow}>
                    <Text style={styles.bottomBookTitle}>
                      {isSubmitting ? 'Preparing...' : !selectedDate ? 'Select Date' : !selectedSlot ? 'Select Time' : payForSomeone ? 'Continue' : 'Checkout'}
                    </Text>
                    <Text style={styles.bottomBookPrice}>{formatNaira(calculatedTotalKobo)}</Text>
                  </View>
                  <View style={styles.bottomBookSubRow}>
                    <Text style={styles.bottomBookParty}>
                      {partySize === 2 ? 'For two' : `${partySize} guests`}
                    </Text>
                    {totalSavingsKobo > 0 ? (
                      <View style={styles.bottomBookSavingsTag}>
                        <Text style={styles.bottomBookSavingsText}>
                          Save {formatNaira(totalSavingsKobo)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.bottomBookSavingsTag}>
                        <Text style={styles.bottomBookSavingsText}>All-inclusive</Text>
                      </View>
                    )}
                  </View>
                </View>
                {isSubmitting ? (
                  <BrandLoader size="small" color={Palette.porcelain} />
                ) : (
                  <ArrowRight size={16} color={Palette.porcelain} style={styles.bottomBookArrow} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* STREAMLINED "ASK SOMEONE TO PAY" MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={isAskToPayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAskToPayModalVisible(false)}
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
                <Text style={styles.modalEyebrow}>ASK SOMEONE TO PAY</Text>
                <Text style={styles.modalTitle}>Share Payment Request</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {offer.title} • {cleanVenueName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsAskToPayModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <X size={20} color={Palette.aubergine} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Streamlined Booking Form */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            >
              {/* Notice Banner */}
              <View style={styles.askToPayBanner}>
                <Share2 size={16} color={Palette.mulberry} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.askToPayBannerText}>
                  Choose your guests and arrival time. We’ll generate a request link locking in your exact booking details.
                </Text>
              </View>

              {/* 1. Branch Selector as Dropdown (if multiple) */}
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
                      <Store size={18} color={Palette.mulberry} style={{ marginRight: 8 }} />
                      <Text style={styles.dropdownValueText} numberOfLines={1}>
                        {selectedBranchObj?.name.replace(/,\s*Lagos.*$/i, '').trim() ||
                          'Select branch location...'}
                      </Text>
                    </View>
                    {isBranchDropdownOpen ? (
                      <ChevronUp size={16} color={Palette.aubergine} />
                    ) : (
                      <ChevronDown size={16} color={Palette.aubergine} />
                    )}
                  </TouchableOpacity>

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
                              setCreatedPaymentLink(null);
                              if (b.offer_id !== offer.id) {
                                setSelectedSlot(null);
                                setSelectedDate('');
                                router.replace(`/offer/${b.offer_id}`);
                              }
                            }}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dropdownItemTitle,
                                isSelected && styles.dropdownItemTitleSelected,
                              ]}
                            >
                              {b.name.replace(/,\s*Lagos.*$/i, '').trim()}
                            </Text>
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
                      <Users size={16} color={Palette.mulberry} />
                    </View>
                    <View>
                      <Text style={styles.partyLabel}>
                        {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
                      </Text>
                      <Text style={styles.partySub}>
                        {partySize === basePartySize
                          ? `Base package includes ${basePartySize} guests`
                          : `${partySize - basePartySize} extra guest(s)`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setPartySize((p) => Math.max(basePartySize, p - 1));
                        setCreatedPaymentLink(null);
                      }}
                      disabled={partySize <= basePartySize}
                      style={[
                        styles.counterBtn,
                        partySize <= basePartySize && styles.counterBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Minus
                        size={15}
                        color={partySize <= basePartySize ? Palette.mutedText : Palette.aubergine}
                      />
                    </TouchableOpacity>

                    <Text style={styles.counterNumber}>{partySize}</Text>

                    <TouchableOpacity
                      onPress={() => {
                        setPartySize((p) => Math.min(maxPartySize, p + 1));
                        setCreatedPaymentLink(null);
                      }}
                      disabled={partySize >= maxPartySize}
                      style={[
                        styles.counterBtn,
                        partySize >= maxPartySize && styles.counterBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Plus
                        size={15}
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

              {/* 3. Arrival Date */}
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
                    <Calendar size={16} color={Palette.mulberry} style={{ marginRight: 8 }} />
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

                {isCalendarOpen && (
                  <View style={styles.calendarCard}>
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

                    <View style={styles.calWeekdaysRow}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((wd) => (
                        <Text key={wd} style={styles.calWeekdayText}>{wd}</Text>
                      ))}
                    </View>

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
                            onPress={() => {
                              handleSelectDate(dateKey);
                              setCreatedPaymentLink(null);
                            }}
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

              {/* 4. Arrival Time */}
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
                    <Clock size={16} color={Palette.mulberry} style={{ marginRight: 8 }} />
                    <Text style={styles.dropdownValueText}>
                      {currentSelectedSlot
                        ? formatSlotTime(currentSelectedSlot.starts_at)
                        : selectedDate
                        ? 'Choose arrival time...'
                        : 'Select arrival date first'}
                    </Text>
                  </View>
                  {isTimeDropdownOpen ? (
                    <ChevronUp size={16} color={Palette.aubergine} />
                  ) : (
                    <ChevronDown size={16} color={Palette.aubergine} />
                  )}
                </TouchableOpacity>

                {isTimeDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {availableSlotsForDate.length > 0 ? (
                      availableSlotsForDate.map((slot) => {
                        const isSlotSelected = selectedSlot === slot.id;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            onPress={() => {
                              setSelectedSlot(slot.id);
                              setIsTimeDropdownOpen(false);
                              setCreatedPaymentLink(null);
                            }}
                            style={[
                              styles.dropdownItem,
                              isSlotSelected && styles.dropdownItemSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dropdownItemTitle,
                                isSlotSelected && styles.dropdownItemTitleSelected,
                              ]}
                            >
                              {formatSlotTime(slot.starts_at)}
                            </Text>
                            {isSlotSelected && (
                              <Check size={16} color={Palette.mulberry} strokeWidth={2.5} />
                            )}
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

              {/* Requester Details for the Payment Recipient */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Your Details (For the recipient)</Text>
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.payerInputLabel}>Your Name *</Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="e.g. Bolanle"
                    placeholderTextColor={Palette.mutedText}
                    value={askRequesterName}
                    onChangeText={setAskRequesterName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.payerInputLabel}>WhatsApp / Phone <Text style={{ fontWeight: '400', color: Palette.mutedText }}>(optional)</Text></Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="+234 800 000 0000"
                    placeholderTextColor={Palette.mutedText}
                    value={askRequesterPhone}
                    onChangeText={setAskRequesterPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Ready Link preview */}
              {createdPaymentLink && (
                <View style={styles.readyLinkCard}>
                  <Text style={styles.readyLinkTitle}>Your request link is ready to share!</Text>
                  <Text style={styles.readyLinkUrl} numberOfLines={1}>{createdPaymentLink}</Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Bar for Streamlined Modal */}
            <View
              style={[
                styles.modalFixedBottomBar,
                { paddingBottom: Math.max(insets.bottom, 14) },
              ]}
            >
              <TouchableOpacity
                onPress={() => void handleAskSomeoneToPay()}
                disabled={paymentRequestBusy}
                style={[
                  styles.modalContinueButton,
                  paymentRequestBusy && { opacity: 0.7 },
                  (!selectedDate || !selectedSlot) && { opacity: 0.55 },
                ]}
                activeOpacity={0.88}
              >
                <View style={styles.bottomBookContent}>
                  <View style={styles.bottomBookMainRow}>
                    <Text style={styles.bottomBookTitle}>
                      {paymentRequestBusy
                        ? 'Creating Request...'
                        : !selectedDate
                        ? 'Select Arrival Date'
                        : !selectedSlot
                        ? 'Select Arrival Time'
                        : createdPaymentLink
                        ? 'Share Link Again'
                        : 'Share Request Link'}
                    </Text>
                    <Text style={styles.bottomBookPrice}>{formatNaira(calculatedTotalKobo)}</Text>
                  </View>
                  <View style={styles.bottomBookSubRow}>
                    <Text style={styles.bottomBookParty}>
                      {partySize === 2 ? 'For two' : `${partySize} guests`}
                    </Text>
                    {totalSavingsKobo > 0 ? (
                      <View style={styles.bottomBookSavingsTag}>
                        <Text style={styles.bottomBookSavingsText}>
                          Save {formatNaira(totalSavingsKobo)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.bottomBookSavingsTag}>
                        <Text style={styles.bottomBookSavingsText}>All-inclusive</Text>
                      </View>
                    )}
                  </View>
                </View>
                {paymentRequestBusy ? (
                  <BrandLoader size="small" color={Palette.porcelain} />
                ) : (
                  <Share2 size={16} color={Palette.porcelain} style={styles.bottomBookArrow} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={isEnquiryModalVisible} transparent animationType="slide" onRequestClose={() => setIsEnquiryModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.enquiryOverlay}>
          <View style={styles.enquirySheet}>
            <View style={styles.enquiryHeader}><View style={{ flex: 1 }}><Text style={styles.shareEyebrow}>ASK THE PARTNER</Text><Text style={styles.shareTitle}>Questions about this experience?</Text></View><TouchableOpacity onPress={() => setIsEnquiryModalVisible(false)} style={styles.modalCloseBtn}><X size={20} color={Palette.aubergine}/></TouchableOpacity></View>
            <Text style={styles.enquiryIntro}>Ask {cleanVenueName} about ingredients, allergies, dietary needs, or anything else before booking.</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput value={enquiryName} onChangeText={setEnquiryName} maxLength={120} placeholder="Your name (optional)" placeholderTextColor={Palette.mutedText} style={styles.enquiryInput}/>
              <TextInput value={enquiryEmail} onChangeText={setEnquiryEmail} maxLength={254} keyboardType="email-address" autoCapitalize="none" placeholder="Email for the partner’s reply" placeholderTextColor={Palette.mutedText} style={styles.enquiryInput}/>
              <TextInput value={enquiryMessage} onChangeText={setEnquiryMessage} maxLength={2000} multiline textAlignVertical="top" placeholder="What would you like to know?" placeholderTextColor={Palette.mutedText} style={[styles.enquiryInput, styles.enquiryMessageInput]}/>
              <Text style={styles.inputHelperText}>{enquiryMessage.length}/2000 characters</Text>
              {enquirySent && <Text style={styles.enquirySuccess}>Your question has been sent to the partner.</Text>}
              {enquiryError ? <Text style={styles.enquiryError}>{enquiryError}</Text> : null}
              <TouchableOpacity disabled={enquiryBusy} onPress={handleSubmitEnquiry} style={[styles.enquirySubmit, enquiryBusy && { opacity: 0.6 }]}><Text style={styles.enquirySubmitText}>{enquiryBusy ? 'Sending…' : 'Send question'}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shareOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(48,29,50,0.42)', padding: 18 },
  shareSheet: { width: '100%', maxWidth: 430, backgroundColor: Palette.porcelain, borderRadius: 22, padding: 18, paddingBottom: 12 },
  shareEyebrow: { color: Palette.mulberry, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 7 },
  shareTitle: { color: Palette.aubergine, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  shareOption: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.secondaryBg, borderRadius: 15, padding: 12, marginBottom: 8 },
  shareOptionCopy: { flex: 1 },
  shareOptionTitle: { color: Palette.aubergine, fontSize: 15, fontWeight: '800', marginBottom: 3 },
  shareOptionDescription: { color: Palette.mutedText, fontSize: 11.5, lineHeight: 16 },
  shareCancel: { alignItems: 'center', paddingVertical: 8 },
  shareCancelText: { color: Palette.mulberry, fontSize: 15, fontWeight: '800' },
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
    backgroundColor: Palette.card,
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
    borderRadius: 12,
    padding: 10,
    marginTop: 2,
  },
  partyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 61, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  partySub: {
    fontSize: 10.5,
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
  shortDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.mutedText,
    marginBottom: 12,
  },
  inclusionsCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    gap: 12,
  },
  venuePreviewCard: {
    marginTop: 16,
    overflow: 'hidden',
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  venuePreviewBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  venuePreviewImage: { width: 58, height: 58, borderRadius: 12, backgroundColor: Palette.secondaryBg },
  venuePreviewCopy: { flex: 1, minWidth: 0 },
  venuePreviewEyebrow: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: Palette.mulberry },
  venuePreviewName: { marginTop: 3, fontSize: 17, fontWeight: '800', color: Palette.aubergine },
  venuePreviewAddress: { marginTop: 3, fontSize: 12, color: Palette.mutedText },
  venuePreviewLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Palette.secondaryBg, borderTopWidth: 1, borderTopColor: Palette.border },
  venuePreviewLinkText: { fontSize: 12, fontWeight: '800', color: Palette.mulberry },
  venuePreviewNotes: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 12, lineHeight: 18, color: Palette.mutedText },
  venuePreviewActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Palette.border, backgroundColor: Palette.secondaryBg },
  venueDirectionsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: Palette.border },
  enquiryButton: { marginHorizontal: 16, marginTop: 8, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  enquiryButtonText: { color: Palette.mulberry, fontWeight: '800', fontSize: 13 },
  enquiryOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(48,29,50,0.42)' },
  enquirySheet: { maxHeight: '88%', backgroundColor: Palette.porcelain, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  enquiryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  enquiryIntro: { color: Palette.mutedText, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  enquiryInput: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, backgroundColor: Palette.card, paddingHorizontal: 13, paddingVertical: 12, color: Palette.aubergine, fontSize: 14, marginBottom: 10 },
  enquiryMessageInput: { minHeight: 120 },
  enquirySuccess: { color: '#28734A', fontSize: 13, fontWeight: '700', marginTop: 8 },
  enquiryError: { color: '#B42318', fontSize: 13, marginTop: 8 },
  enquirySubmit: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 24, backgroundColor: Palette.mulberry, marginTop: 12 },
  enquirySubmitText: { color: Palette.porcelain, fontSize: 15, fontWeight: '800' },
  bookingMessageInput: { minHeight: 52, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.card, borderRadius: 10, color: Palette.aubergine, paddingHorizontal: 11, paddingVertical: 7, fontSize: 13 },
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomAskToPayBtn: {
    minWidth: 156,
    paddingHorizontal: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.mulberry,
    backgroundColor: Palette.secondaryBg,
    flexShrink: 0,
  },
  bottomAskToPayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.mulberry,
    letterSpacing: -0.1,
  },
  bottomBookButton: {
    flex: 1,
    minWidth: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomBookContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  bottomBookMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bottomBookTitle: {
    color: Palette.porcelain,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bottomBookPrice: {
    color: Palette.champagne,
    fontSize: 13.5,
    fontWeight: '800',
  },
  bottomBookSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  bottomBookParty: {
    color: Palette.porcelain,
    fontSize: 10.5,
    fontWeight: '600',
    opacity: 0.92,
  },
  bottomBookSavingsTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  bottomBookSavingsText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  bottomBookArrow: {
    opacity: 0.9,
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: '#FFFFFF',
  },
  modalEyebrow: {
    color: Palette.mulberry,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  askToPayBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5ECF0',
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.18)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  askToPayBannerText: {
    flex: 1,
    fontSize: 11,
    color: Palette.aubergine,
    lineHeight: 16,
    fontWeight: '500',
  },
  readyLinkCard: {
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: '#E8DBC6',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  readyLinkTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  readyLinkUrl: {
    fontSize: 10.5,
    color: Palette.mulberry,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(48, 29, 50, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Palette.porcelain,
  },
  modalSection: {
    marginBottom: 11,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 5,
  },

  /* Dropdown Styles (Branch, Date, Time) */
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  dropdownSubText: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 1,
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
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  inputWrapDisabled: {
    backgroundColor: '#F7F2EC',
    borderColor: '#E8DBC6',
  },
  emailInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.aubergine,
    padding: 0,
  },
  emailInputDisabled: {
    color: Palette.aubergine,
    fontWeight: '600',
  },
  payForSomeoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Palette.secondaryBg,
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 8,
  },
  payForSomeoneCardActive: {
    borderColor: Palette.mulberry,
    backgroundColor: '#F8EEF3',
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Palette.mulberry,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: Palette.mulberry,
  },
  payForSomeoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  payForSomeoneSub: {
    fontSize: 10.5,
    color: Palette.mutedText,
    marginTop: 1,
  },
  payerDetailsCard: {
    backgroundColor: '#F8F4EF',
    borderWidth: 1,
    borderColor: '#E8DBC6',
    borderRadius: 11,
    padding: 10,
    marginTop: 8,
    gap: 5,
  },
  payerDetailsNotice: {
    fontSize: 10.5,
    color: Palette.mutedText,
    lineHeight: 14,
    marginBottom: 2,
  },
  payerInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
    marginTop: 4,
  },
  payForMeButton: {
    position: 'absolute',
    left: 20,
    top: -42,
    zIndex: 2,
    paddingVertical: 8,
  },
  payForMeButtonText: {
    color: Palette.mulberry,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  paymentChoiceLinks: {
    position: 'absolute',
    left: 16,
    top: -34,
    zIndex: 2,
    flexDirection: 'row',
    gap: 16,
  },
  inputHelperText: {
    fontSize: 10.5,
    color: Palette.mutedText,
    marginTop: 3,
    lineHeight: 14,
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
    padding: 8,
    marginBottom: 6,
  },
  appleNoticeText: {
    flex: 1,
    fontSize: 10.5,
    color: '#8F662A',
    fontWeight: '600',
    lineHeight: 14,
  },

  /* Fixed Bottom Nav in Modal */
  modalFixedBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8DBC6',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContinueButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
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
