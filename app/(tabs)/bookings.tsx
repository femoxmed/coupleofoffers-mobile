import { BrandRefreshScrollView } from '../../components/BrandRefreshScrollView';
import { BrandLoader } from '../../components/BrandLoader';
import { UnpaidBookingCard } from '../../components/UnpaidBookingCard';
import { DataState } from '../../components/DataState';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  KeyRound,
  ShieldCheck,
  LogIn,
  UserPlus,
  X,
  QrCode,
  HelpCircle,
  MessageCircle,
  Mail,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Ticket,
  Check,
  Bell,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { formatNaira } from '../../constants/config';
import {
  checkoutService,
  ConfirmedBooking,
  RescheduleSlotItem,
} from '../../services/checkoutService';
import { notificationDestination, notificationService, ServerNotification } from '../../services/notificationService';
import { useAuthStore } from '../../store/useAuthStore';
import { QRCode } from '../../components/QRCode';

const FAQS = [
  {
    q: 'How do Couple Of Offers bookings work?',
    a: 'Browse curated packages for two or more. Select your preferred date, time slot, and guest count. Once booked, your guaranteed table and instant 4-digit arrival code appear immediately in your app and email.',
  },
  {
    q: 'What is the rescheduling and cancellation policy?',
    a: 'You can reschedule your reservation free of charge up to 24 hours prior to your scheduled slot. Cancellations requested at least 48 hours in advance are eligible for a 100% full refund back to your original payment card via Bachs.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all Nigerian debit/credit cards, bank transfers, and virtual accounts via our secure, PCI-DSS certified checkout platform powered by Bachs.',
  },
  {
    q: 'Can dietary requirements or allergies be accommodated?',
    a: 'Yes! Inform the venue host upon arrival or message our concierge beforehand with your booking reference. Restaurant partners prepare custom alternatives wherever available.',
  },
  {
    q: 'How do I check in when I arrive at the restaurant?',
    a: 'Simply present your 4-digit arrival code or open your digital QR pass from the Bookings tab for the host desk to scan. Your table and package are already confirmed and paid.',
  },
];

export default function BookingsScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ tab?: string; help?: string }>();
  const user = useAuthStore((s) => s.user);

  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingsError, setBookingsError] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'refunds' | 'unpaid'>('upcoming');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'self' | 'others'>('all');

  // Modals state
  const [selectedVoucher, setSelectedVoucher] = useState<ConfirmedBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<ConfirmedBooking | null>(null);
  const [refundBooking, setRefundBooking] = useState<ConfirmedBooking | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [helpBookingRef, setHelpBookingRef] = useState<string | undefined>(undefined);

  const [serverNotifs, setServerNotifs] = useState<{ unreadCount: number; items: ServerNotification[] }>({
    unreadCount: 0,
    items: [],
  });

  useEffect(() => {
    // Navigation parameters arrive from notification deep links.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (routeParams.tab === 'unpaid') setActiveTab('unpaid');
    if (routeParams.help === '1') setIsHelpOpen(true);
  }, [routeParams.tab, routeParams.help]);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      return;
    }
    setBookingsError(false);
    try {
      const items = await checkoutService.getBookings(user.email);
      if (useAuthStore.getState().user?.email !== user.email) return;
      setBookings(items);
    } catch (err) {
      if (useAuthStore.getState().user?.email !== user.email) return;
      setBookingsError(true);
      setBookings([]);
      console.warn('Error loading bookings:', err);
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setServerNotifs({ unreadCount: 0, items: [] });
      return;
    }
    try {
      const res = await notificationService.getNotifications();
      if (useAuthStore.getState().user?.email !== user.email) return;
      setServerNotifs(res);
    } catch {
      if (useAuthStore.getState().user?.email !== user.email) return;
      setServerNotifs({ unreadCount: 0, items: [] });
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
      loadNotifications();
    }, [loadBookings, loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBookings(), loadNotifications()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const refresh = setInterval(() => { void loadBookings(); void loadNotifications(); }, 30_000);
    return () => clearInterval(refresh);
  }, [loadBookings, loadNotifications]);

  // Group bookings into tabs
  const { upcomingBookings, pastBookings, refundBookings, unpaidBookings } = useMemo(() => {
    const up: ConfirmedBooking[] = [];
    const past: ConfirmedBooking[] = [];
    const ref: ConfirmedBooking[] = [];

    const now = Date.now();
    const pending: ConfirmedBooking[] = [];
    for (const b of bookings) {
      if (b.status === 'pending') { if (b.checkoutExpiresAt && Date.parse(b.checkoutExpiresAt) > now) pending.push(b); continue; }
      const isRefundState = [
        'refund_pending',
        'refund_submitted',
        'refunded',
        'refund_failed',
        'review',
        'cancelled',
      ].includes(b.status);

      if (isRefundState) {
        ref.push(b);
      } else if (b.status === 'completed') {
        past.push(b);
      } else {
        const startsMs = b.startsAt ? Date.parse(b.startsAt) : null;
        if (startsMs && startsMs < now) {
          past.push(b);
        } else {
          up.push(b);
        }
      }
    }

    return {
      upcomingBookings: up,
      pastBookings: past,
      refundBookings: ref,
      unpaidBookings: pending,
    };
  }, [bookings]);

  const tabList =
    activeTab === 'upcoming'
      ? upcomingBookings
      : activeTab === 'past'
      ? pastBookings
      : activeTab === 'refunds' ? refundBookings : [];
  const displayedList = tabList.filter((booking) => {
    if (bookingFilter === 'all') return true;
    const payer = booking.payerEmail?.trim().toLowerCase();
    const guest = booking.email?.trim().toLowerCase();
    const current = user?.email?.trim().toLowerCase();
    const isOther = booking.isPayer !== undefined
      ? booking.isPayer && !booking.isGuest
      : Boolean(payer && current && payer === current && guest !== current);
    return bookingFilter === 'others' ? isOther : !isOther;
  });

  // 1. UNLOGGED IN: Prompt User to Sign In (Optically centered above floating nav)
  if (!user) {
    return (
      <SafeAreaView style={styles.unauthContainer} edges={['top']}>
        <View style={styles.unauthContent}>
          <View style={styles.unauthIconCircle}>
            <Calendar size={38} color={Palette.mulberry} strokeWidth={2.2} />
          </View>

          <Text style={styles.unauthTitle}>Sign In to View Bookings</Text>
          <Text style={styles.unauthSubtitle}>
            Sign in or create an account to view your confirmed table reservations, 4-digit arrival codes, and receipts.
          </Text>

          <TouchableOpacity
            style={styles.signInPrimaryBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.88}
          >
            <LogIn size={16} color={Palette.porcelain} style={{ marginRight: 6 }} />
            <Text style={styles.signInPrimaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpSecondaryBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.75}
          >
            <UserPlus size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
            <Text style={styles.signUpSecondaryBtnText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Row with Help & Concierge Pill */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBarTitle}>Your Bookings</Text>
          <Text style={styles.headerBarSub}>
            Digital check-in passes, table management & support
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.notifHeaderBtn}
            onPress={() => setIsNotifOpen(true)}
            activeOpacity={0.82}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Bell size={16} color={Palette.aubergine} />
            {((serverNotifs?.unreadCount || 0) > 0) && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {serverNotifs.unreadCount > 0
                    ? serverNotifs.unreadCount > 9
                      ? '9+'
                      : serverNotifs.unreadCount
                    : serverNotifs.unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              setHelpBookingRef(undefined);
              setIsHelpOpen(true);
            }}
            activeOpacity={0.82}
          >
            <HelpCircle size={15} color={Palette.aubergine} style={{ marginRight: 5 }} />
            <Text style={styles.helpButtonText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3 Subtabs: Upcoming | Past | Refunds */}
      <View style={styles.subtabsWrap}>
        <TouchableOpacity
          style={[styles.subtab, activeTab === 'upcoming' && styles.subtabActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.subtabText,
              activeTab === 'upcoming' && styles.subtabTextActive,
            ]}
          >
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.subtab, activeTab === 'unpaid' && styles.subtabActive]} onPress={() => setActiveTab('unpaid')}>
          <Text style={[styles.subtabText, activeTab === 'unpaid' && styles.subtabTextActive]}>Unpaid ({unpaidBookings.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subtab, activeTab === 'past' && styles.subtabActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.subtabText,
              activeTab === 'past' && styles.subtabTextActive,
            ]}
          >
            Past ({pastBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subtab, activeTab === 'refunds' && styles.subtabActive]}
          onPress={() => setActiveTab('refunds')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.subtabText,
              activeTab === 'refunds' && styles.subtabTextActive,
            ]}
          >
            Refunds
          </Text>
          {refundBookings.length > 0 && (
            <View style={styles.refundsBadge}>
              <Text style={styles.refundsBadgeText}>{refundBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'upcoming' && <View style={styles.bookingFilterRow}>
        {([['all', 'All bookings'], ['self', 'My bookings'], ['others', 'Paid for others']] as const).map(([value, label]) => (
          <TouchableOpacity key={value} onPress={() => setBookingFilter(value)} style={[styles.bookingFilterChip, bookingFilter === value && styles.bookingFilterChipActive]}>
            <Text style={[styles.bookingFilterText, bookingFilter === value && styles.bookingFilterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>}

      {/* Scrollable Bookings List */}
      <BrandRefreshScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {bookingsError && <DataState message="Unable to load bookings." onRetry={() => { void loadBookings(); }} />}
        {activeTab === 'unpaid' && <View>
          <Text style={{ color: Palette.mutedText, fontSize: 12, lineHeight: 19, marginBottom: 16 }}>Resume within 48 hours. Price and availability are checked again. A place is reserved only during the active checkout hold.</Text>
          {unpaidBookings.length === 0 && <Text style={{ color: Palette.mutedText }}>No unpaid bookings.</Text>}
          {unpaidBookings.map(booking => <UnpaidBookingCard key={booking.reference} booking={booking} refresh={() => { void loadBookings(); }} />)}
        </View>}
        {/* Policy Highlights Info Bar for Refunds tab */}
        {activeTab === 'refunds' && (
          <View style={styles.policyHighlightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
              <Text style={styles.policyHighlightTitle}>Cancellation & Refund Policy</Text>
            </View>
            <Text style={styles.policyHighlightText}>
              • {'>'}48 hours advance notice: 100% full refund back to original payment card via Bachs.{'\n'}
              • {'<'}48 hours notice: Concierge review to arrange courtesy rescheduling or platform credit.
            </Text>
          </View>
        )}

        {activeTab === 'unpaid' ? null : displayedList.length > 0 ? (
          displayedList.map((b) => {
            const isRefund = [
              'refund_pending',
              'refund_submitted',
              'refunded',
              'refund_failed',
              'review',
              'cancelled',
            ].includes(b.status);

            return (
              <View key={b.id || b.reference} style={styles.bookingCard}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.statusPill,
                      isRefund ? styles.statusPillRefund : styles.statusPillConfirmed,
                    ]}
                  >
                    {isRefund ? (
                      <RotateCcw size={12} color={Palette.mulberry} style={{ marginRight: 4 }} />
                    ) : (
                      <CheckCircle2 size={12} color={Palette.mulberry} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        styles.statusPillText,
                        isRefund && { color: Palette.mulberry },
                      ]}
                    >
                      {b.status === 'refund_pending'
                        ? 'Refund Pending'
                        : b.status === 'refund_submitted'
                        ? 'Refund Submitted'
                        : b.status === 'refunded'
                        ? 'Refund Completed'
                        : b.status === 'refund_failed'
                        ? 'Refund Failed'
                        : b.status === 'review'
                        ? 'Concierge Review'
                        : b.status === 'cancelled'
                        ? 'Cancelled'
                        : b.status === 'completed'
                        ? 'Completed'
                        : 'Confirmed'}
                    </Text>
                  </View>

                  <Text style={styles.referenceText}>
                    Ref: {b.reference.slice(-10).toUpperCase()}
                  </Text>
                </View>

                {/* Experience & Venue */}
                <Text style={styles.experienceTitle}>{b.offerTitle}</Text>
                <View style={styles.venueRow}>
                  <MapPin size={13} color={Palette.mutedText} style={{ marginRight: 4 }} />
                  <Text style={styles.venueText}>{b.venueName}</Text>
                </View>
                {b.payerEmail && b.payerEmail.toLowerCase() !== b.email.toLowerCase() && (
                  <Text style={styles.paidByText}>{b.isPayer ? 'You paid for this experience' : `Paid by ${b.payerName || b.payerEmail}`}</Text>
                )}

                {/* Arrival Code Banner */}
                {!isRefund && (
                  <TouchableOpacity
                    style={styles.arrivalPinBanner}
                    onPress={() => setSelectedVoucher(b)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <KeyRound size={14} color={Palette.mulberry} style={{ marginRight: 6 }} />
                      <Text style={styles.arrivalPinLabel}>Arrival Code:</Text>
                      <View style={styles.arrivalPinDigits}>
                        <Text style={styles.arrivalPinNumber}>{b.arrivalPin}</Text>
                      </View>
                    </View>
                    <View style={styles.qrPromptRow}>
                      <QrCode size={13} color={Palette.mulberry} style={{ marginRight: 4 }} />
                      <Text style={styles.qrPromptText}>Tap for QR pass</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Refund Status Details */}
                {isRefund && (
                  <View style={styles.refundInfoBox}>
                    <AlertCircle size={14} color={Palette.mulberry} style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.refundInfoTitle}>
                        {b.status === 'refund_pending'
                          ? 'Automated refund initiated via Bachs.'
                          : 'Concierge is reviewing your cancellation.'}
                      </Text>
                      {b.refundReason ? (
                        <Text style={styles.refundInfoSub} numberOfLines={2}>
                          Reason: {b.refundReason}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Date & Time */}
                <View style={styles.detailRow}>
                  <Calendar size={14} color={Palette.mutedText} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>
                    {b.slotTime || 'Reserved Slot'} • Party of {b.partySize}
                  </Text>
                </View>

                {b.venueAddress ? (
                  <View style={styles.detailRow}>
                    <MapPin size={14} color={Palette.mutedText} style={{ marginRight: 6 }} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {b.venueAddress}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.divider} />

                {/* Price & Action Row */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Paid Upfront via Bachs</Text>
                    <Text style={styles.priceAmount}>{formatNaira(b.amountKobo)}</Text>
                  </View>

                  {/* Actions Grid */}
                  <View style={styles.cardActionsGroup}>
                    {!isRefund && (
                      <>
                        <TouchableOpacity
                          style={styles.passBtn}
                          onPress={() => setSelectedVoucher(b)}
                          activeOpacity={0.85}
                        >
                          <QrCode size={13} color={Palette.porcelain} style={{ marginRight: 4 }} />
                          <Text style={styles.passBtnText}>Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnOutline}
                          onPress={() => setRescheduleBooking(b)}
                          activeOpacity={0.8}
                        >
                          <Calendar size={12} color={Palette.aubergine} style={{ marginRight: 4 }} />
                          <Text style={styles.actionBtnOutlineText}>Reschedule</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtnOutline, styles.refundBtnOutline]}
                          onPress={() => setRefundBooking(b)}
                          activeOpacity={0.8}
                        >
                          <RotateCcw size={12} color={Palette.mulberry} style={{ marginRight: 4 }} />
                          <Text style={[styles.actionBtnOutlineText, { color: Palette.mulberry }]}>
                            Refund
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {isRefund && (
                      <TouchableOpacity
                        style={styles.checkStatusBtn}
                        onPress={() => {
                          const url = `https://wa.me/2348000000000?text=${encodeURIComponent(
                            `Hi Couple Of Offers concierge, checking on refund status for booking ${b.reference} (${b.offerTitle}).`
                          )}`;
                          Linking.openURL(url).catch(() => {
                            setHelpBookingRef(b.reference);
                            setIsHelpOpen(true);
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <MessageCircle size={13} color={Palette.porcelain} style={{ marginRight: 5 }} />
                        <Text style={styles.checkStatusBtnText}>Concierge Update</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={36} color={Palette.mulberry} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming'
                ? 'No Upcoming Reservations'
                : activeTab === 'past'
                ? 'No Past Bookings'
                : 'No Active Refund Requests'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'When you book an upfront experience, your guaranteed table, QR pass, and 4-digit arrival code appear here.'
                : activeTab === 'past'
                ? 'Your completed date experiences will be archived here for easy re-booking.'
                : 'All your reservations are in good standing. You can request changes or refunds from your upcoming reservations anytime.'}
            </Text>

            {activeTab !== 'refunds' && (
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/explore')}
                activeOpacity={0.88}
              >
                <Text style={styles.browseBtnText}>Browse Experiences</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </BrandRefreshScrollView>

      {/* ========================================================= */}
      {/* MODAL 1: TABLE CHECK-IN PASS & QR CODE MODAL             */}
      {/* ========================================================= */}
      <Modal
        visible={Boolean(selectedVoucher)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedVoucher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle}>Table Check-In Pass</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedVoucher?.venueName} • {selectedVoucher?.offerTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedVoucher(null)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <X size={20} color={Palette.aubergine} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.voucherModalContent}
            >
              {selectedVoucher && (
                <>
                  {/* Arrival Code & QR Code Golden Card (Side-by-Side) */}
                  <View style={styles.arrivalPinCard}>
                    <View style={styles.pinHeaderRow}>
                      <Text style={styles.pinHeaderLabel}>YOUR ARRIVAL CHECK-IN CODE</Text>
                    </View>

                    <View style={styles.codeAndQrRow}>
                      {/* QR Code Scan Pass */}
                      <View style={styles.qrContainer}>
                        <View style={styles.qrBox}>
                          <QRCode
                            value={`https://coupleofoffers.com/partner?code=${selectedVoucher.arrivalPin}&ref=${selectedVoucher.reference}`}
                            size={82}
                            bgColor="#FFFFFF"
                            fgColor={Palette.aubergine}
                          />
                        </View>
                        <Text style={styles.qrScanLabel}>SCAN PASS</Text>
                      </View>

                      {/* 4-Digit Code Column */}
                      <View style={styles.pinRightCol}>
                        <Text style={styles.pinSubLabel}>4-DIGIT PIN</Text>
                        <View style={styles.pinDigitsRow}>
                          {selectedVoucher.arrivalPin.split('').map((digit, idx) => (
                            <View key={idx} style={styles.pinDigitBox}>
                              <Text style={styles.pinDigitText}>{digit}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.pinHint}>Show to host upon arrival</Text>
                      </View>
                    </View>

                    <Text style={styles.pinInstructions}>
                      Show this 4-digit code or let the host scan your QR pass upon arrival at the venue.
                    </Text>
                  </View>

                  {/* Summary Details */}
                  <View style={styles.voucherDetailsCard}>
                    <View style={styles.voucherDetailRow}>
                      <Text style={styles.voucherDetailLabel}>Reference Number</Text>
                      <Text
                        style={styles.voucherDetailValue}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        selectable
                      >
                        {selectedVoucher.reference.toUpperCase().startsWith('COO_')
                          ? selectedVoucher.reference.toUpperCase()
                          : selectedVoucher.reference.length > 14
                          ? selectedVoucher.reference.slice(-10).toUpperCase()
                          : selectedVoucher.reference.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.voucherDetailRow}>
                      <Text style={styles.voucherDetailLabel}>Date & Time</Text>
                      <Text style={styles.voucherDetailValue}>
                        {selectedVoucher.slotTime || 'Reserved Slot'} • Party of {selectedVoucher.partySize}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.voucherDetailRow}>
                      <Text style={styles.voucherDetailLabel}>Amount Paid via Bachs</Text>
                      <Text style={styles.voucherDetailAmount}>
                        {formatNaira(selectedVoucher.amountKobo)}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Action Buttons inside Pass */}
                  <View style={styles.passActionsRow}>
                    <TouchableOpacity
                      style={styles.passSecondaryBtn}
                      onPress={() => {
                        const target = selectedVoucher;
                        setSelectedVoucher(null);
                        setRescheduleBooking(target);
                      }}
                      activeOpacity={0.8}
                    >
                      <Calendar size={14} color={Palette.aubergine} style={{ marginRight: 6 }} />
                      <Text style={styles.passSecondaryBtnText}>Reschedule Slot</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.passSecondaryBtn, { borderColor: 'rgba(116, 61, 96, 0.3)' }]}
                      onPress={() => {
                        const target = selectedVoucher;
                        setSelectedVoucher(null);
                        setRefundBooking(target);
                      }}
                      activeOpacity={0.8}
                    >
                      <RotateCcw size={14} color={Palette.mulberry} style={{ marginRight: 6 }} />
                      <Text style={[styles.passSecondaryBtnText, { color: Palette.mulberry }]}>
                        Cancel & Refund
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.modalDoneBtn}
                    onPress={() => setSelectedVoucher(null)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.modalDoneBtnText}>Close Pass</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* NOTIFICATIONS MODAL                                       */}
      {/* ========================================================= */}
      <Modal
        visible={isNotifOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNotifOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.notifModalIconWrap}>
                  <Bell size={18} color={Palette.aubergine} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Notifications & Alerts</Text>
                  <Text style={styles.modalSubtitle}>
                    Table passes, arrival codes & date reminders
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsNotifOpen(false)}
                activeOpacity={0.7}
              >
                <X size={16} color={Palette.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
              {serverNotifs.unreadCount > 0 && (
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    marginBottom: 10,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: 'rgba(116, 61, 96, 0.08)',
                  }}
                  onPress={async () => {
                    await notificationService.markAllAsRead();
                    loadNotifications();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: Palette.mulberry }}>
                    Mark all as read
                  </Text>
                </TouchableOpacity>
              )}

              {/* 1. Real Server In-App Notifications */}
              {serverNotifs.items?.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notifCard,
                    !item.read_at && { borderColor: Palette.mulberry, backgroundColor: '#FFFFFF' },
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (!item.read_at) {
                      await notificationService.markAsRead(item.id);
                      loadNotifications();
                    }
                    setIsNotifOpen(false);
                    router.push(notificationDestination(item));
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {!item.read_at && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: Palette.mulberry,
                            marginRight: 6,
                          }}
                        />
                      )}
                      <Text style={styles.notifOfferTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.notifVenueText}>{item.message}</Text>
                  <Text style={{ fontSize: 10, color: Palette.mutedText, fontFamily: 'SpaceMono' }}>
                    {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* 2. Confirmed Table Passes with Arrival Codes */}
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((b) => (
                  <View key={b.reference} style={styles.notifCard}>
                    <View style={styles.notifCardTop}>
                      <View style={styles.notifBadgeWrap}>
                        <CheckCircle2 size={13} color="#FFFFFF" />
                        <Text style={styles.notifBadgeLabel}>Table Confirmed</Text>
                      </View>
                      <Text style={styles.notifRefText}>
                        Ref: {b.reference.slice(-10).toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.notifOfferTitle}>{b.offerTitle}</Text>
                    <Text style={styles.notifVenueText}>
                      {b.venueName} • Table for {b.partySize}
                    </Text>

                    <View style={styles.notifPinBanner}>
                      <View>
                        <Text style={styles.notifPinBannerLabel}>Your Arrival Code</Text>
                        <Text style={styles.notifPinBannerCode}>{b.arrivalPin}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.notifViewPassBtn}
                        onPress={() => {
                          setIsNotifOpen(false);
                          setSelectedVoucher(b);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.notifViewPassBtnText}>View Pass →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (serverNotifs.items?.length ?? 0) === 0 ? (
                <View style={styles.notifEmptyWrap}>
                  <Bell size={32} color={Palette.mutedText} style={{ opacity: 0.6, marginBottom: 8 }} />
                  <Text style={styles.notifEmptyTitle}>No Unread Notifications</Text>
                  <Text style={styles.notifEmptySub}>
                    When you book an experience, your guaranteed table confirmation and 4-digit arrival code will appear here.
                  </Text>
                </View>
              ) : null}

              {/* General Reminder Alert */}
              <View style={styles.notifGeneralCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Clock size={14} color={Palette.mulberry} />
                  <Text style={styles.notifGeneralTitle}>24h & 2h Arrival Alerts</Text>
                </View>
                <Text style={styles.notifGeneralBody}>
                  Automatic SMS and push alerts are sent before your scheduled date so your table is always waiting.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.notifDoneBtn}
                onPress={() => setIsNotifOpen(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.notifDoneBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: RESCHEDULE DIALOG                                */}
      {/* ========================================================= */}
      <RescheduleModal
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onSuccess={async () => {
          setRescheduleBooking(null);
          await loadBookings();
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 3: CANCELLATION & REFUND DIALOG                     */}
      {/* ========================================================= */}
      <RefundModal
        booking={refundBooking}
        onClose={() => setRefundBooking(null)}
        onSuccess={async () => {
          setRefundBooking(null);
          setActiveTab('refunds');
          await loadBookings();
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 4: HELP & CONCIERGE DRAWER                          */}
      {/* ========================================================= */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialBookingRef={helpBookingRef}
        userEmail={user.email}
        userName={user.name}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENT: RESCHEDULE MODAL
// ---------------------------------------------------------------------------
function RescheduleModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: ConfirmedBooking | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<RescheduleSlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check policy: >= 24 hours notice for free self-service reschedule
  const startsAtMs = booking?.startsAt ? Date.parse(booking.startsAt) : Date.now() + 86400000 * 2;
  const hoursNotice = Math.max(0, Math.round((startsAtMs - Date.now()) / (1000 * 60 * 60)));
  const isAutoEligible = hoursNotice >= 24;

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setSelectedSlotId(null);
    setReason('');

    checkoutService
      .getRescheduleSlots(booking.reference)
      .then((items) => {
        setSlots(items);
        const dates = Array.from(new Set(items.map((s) => s.starts_at.slice(0, 10))));
        if (dates.length > 0) setSelectedDate(dates[0]);
      })
      .finally(() => setLoading(false));
  }, [booking]);

  const datesList = useMemo(() => {
    return Array.from(new Set(slots.map((s) => s.starts_at.slice(0, 10)))).sort();
  }, [slots]);

  const slotsOnDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => s.starts_at.slice(0, 10) === selectedDate);
  }, [selectedDate, slots]);

  const handleConfirmReschedule = async () => {
    if (!booking) return;
    if (!selectedSlotId) {
      Alert.alert('Select Time Slot', 'Please choose an arrival time for your rescheduled visit.');
      return;
    }

    const targetSlot = slots.find((s) => s.id === selectedSlotId);
    if (!targetSlot) return;

    const d = new Date(targetSlot.starts_at);
    const slotFormatted = `${d.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })}, ${d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    setSubmitting(true);
    try {
      const res = await checkoutService.rescheduleBooking(
        booking.reference,
        selectedSlotId,
        slotFormatted,
        targetSlot.starts_at,
        reason
      );
      Alert.alert('Reservation Rescheduled', res.message || 'Your new arrival slot is confirmed!');
      onSuccess();
    } catch {
      Alert.alert('Notice', 'Reservation rescheduled locally. Our concierge will verify with the host.');
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal visible={Boolean(booking)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Reschedule Reservation</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {booking.offerTitle} • {booking.venueName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <X size={20} color={Palette.aubergine} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogScroll}>
            {/* Policy Banner */}
            <View
              style={[
                styles.policyNoticeCard,
                isAutoEligible ? styles.policyNoticeAuto : styles.policyNoticeManual,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Clock
                  size={14}
                  color={isAutoEligible ? Palette.aubergine : Palette.mulberry}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.policyNoticeTitle}>
                  {isAutoEligible
                    ? 'Free Self-Service Rescheduling (>24h notice)'
                    : 'Within 24-Hour Preparation Window'}
                </Text>
              </View>
              <Text style={styles.policyNoticeText}>
                {isAutoEligible
                  ? 'You may reschedule your booking free of charge. Choose your preferred alternative arrival date and time below.'
                  : 'Because this reservation is within 24 hours, venue kitchen preparations have started. Self-service slots are closed, but our concierge is on standby to assist with courtesy date changes.'}
              </Text>
            </View>

            {/* If within 24h, offer direct Concierge button */}
            {!isAutoEligible && (
              <TouchableOpacity
                style={styles.conciergeActionBtn}
                onPress={() => {
                  const url = `https://wa.me/2348000000000?text=${encodeURIComponent(
                    `Hi Couple Of Offers concierge, I need an urgent courtesy reschedule for my reservation: ${booking.offerTitle} (Ref: ${booking.reference}).`
                  )}`;
                  Linking.openURL(url);
                }}
                activeOpacity={0.88}
              >
                <MessageCircle size={16} color={Palette.porcelain} style={{ marginRight: 8 }} />
                <Text style={styles.conciergeActionBtnText}>Request Reschedule via WhatsApp</Text>
              </TouchableOpacity>
            )}

            {isAutoEligible && (
              <>
                {loading ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <BrandLoader size="small" color={Palette.mulberry} />
                    <Text style={{ marginTop: 8, fontSize: 13, color: Palette.mutedText }}>
                      Loading available slots...
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Date Selector */}
                    <Text style={styles.dialogSectionLabel}>Select Alternative Date</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.datePillsRow}
                    >
                      {datesList.map((dStr) => {
                        const d = new Date(`${dStr}T00:00:00`);
                        const isSelected = selectedDate === dStr;
                        return (
                          <TouchableOpacity
                            key={dStr}
                            onPress={() => setSelectedDate(dStr)}
                            style={[
                              styles.datePill,
                              isSelected && styles.datePillSelected,
                            ]}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.datePillDay,
                                isSelected && styles.datePillTextSelected,
                              ]}
                            >
                              {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </Text>
                            <Text
                              style={[
                                styles.datePillDate,
                                isSelected && styles.datePillTextSelected,
                              ]}
                            >
                              {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Time Slots Grid */}
                    <Text style={styles.dialogSectionLabel}>Select Arrival Time</Text>
                    <View style={styles.timeSlotsGrid}>
                      {slotsOnDate.map((s) => {
                        const isSelected = selectedSlotId === s.id;
                        const d = new Date(s.starts_at);
                        const timeStr = d.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => setSelectedSlotId(s.id)}
                            style={[
                              styles.timeSlotChip,
                              isSelected && styles.timeSlotChipSelected,
                            ]}
                            activeOpacity={0.75}
                          >
                            <Clock
                              size={13}
                              color={isSelected ? Palette.porcelain : Palette.aubergine}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.timeSlotChipText,
                                isSelected && styles.timeSlotChipTextSelected,
                              ]}
                            >
                              {timeStr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Optional Reason */}
                    <Text style={styles.dialogSectionLabel}>Reason for Reschedule (Optional)</Text>
                    <TextInput
                      style={styles.dialogTextInput}
                      placeholder="e.g. Flight delay, unexpected meeting..."
                      placeholderTextColor={Palette.mutedText}
                      value={reason}
                      onChangeText={setReason}
                    />

                    {/* Action Button */}
                    <TouchableOpacity
                      style={styles.confirmSubmitBtn}
                      onPress={handleConfirmReschedule}
                      disabled={submitting || !selectedSlotId}
                      activeOpacity={0.88}
                    >
                      {submitting ? (
                        <BrandLoader color={Palette.porcelain} size="small" />
                      ) : (
                        <Text style={styles.confirmSubmitBtnText}>Confirm New Reservation</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENT: REFUND & CANCELLATION MODAL
// ---------------------------------------------------------------------------
function RefundModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: ConfirmedBooking | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reasonCategory, setReasonCategory] = useState('Schedule conflict or sudden unavailability');
  const [notes, setNotes] = useState('');
  const [refundAction, setRefundAction] = useState<'refund' | 'credit'>('refund');
  const [submitting, setSubmitting] = useState(false);

  const startsAtMs = booking?.startsAt ? Date.parse(booking.startsAt) : Date.now() + 86400000 * 3;
  const hoursNotice = Math.max(0, Math.round((startsAtMs - Date.now()) / (1000 * 60 * 60)));
  const isAutoEligible = hoursNotice >= 48;

  const REASONS = [
    'Schedule conflict or sudden unavailability',
    'Change of date or location preference',
    'Emergency or personal circumstances',
    'Other reason',
  ];

  const handleSubmitRefund = async () => {
    if (!booking) return;
    setSubmitting(true);
    const fullReason = notes.trim() ? `${reasonCategory} - ${notes.trim()}` : reasonCategory;

    try {
      const res = await checkoutService.requestRefund(booking.reference, fullReason, refundAction);
      Alert.alert(
        res.eligibleAuto ? 'Refund Initiated' : 'Request Received',
        res.message || 'Your cancellation request has been submitted.'
      );
      onSuccess();
    } catch {
      Alert.alert('Notice', 'Cancellation recorded. Our concierge team will reach out promptly.');
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal visible={Boolean(booking)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Cancel & Request Refund</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {booking.offerTitle} • {formatNaira(booking.amountKobo)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <X size={20} color={Palette.aubergine} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogScroll}>
            {/* Policy Banner */}
            <View
              style={[
                styles.policyNoticeCard,
                isAutoEligible ? styles.policyNoticeAuto : styles.policyNoticeManual,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <ShieldCheck
                  size={14}
                  color={isAutoEligible ? Palette.aubergine : Palette.mulberry}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.policyNoticeTitle}>
                  {isAutoEligible
                    ? '100% Full Refund Eligible (>48h notice)'
                    : 'Concierge Review Window (<48h notice)'}
                </Text>
              </View>
              <Text style={styles.policyNoticeText}>
                {isAutoEligible
                  ? `Because your cancellation request is ${hoursNotice}h in advance (>48h), your full payment of ${formatNaira(
                      booking.amountKobo
                    )} will be refunded directly to your original card via Bachs.`
                  : `Because this reservation is scheduled within 48 hours (${hoursNotice}h notice), our concierge team will review your request to explore courtesy rescheduling or platform credit.`}
              </Text>
            </View>

            {/* Reason Options */}
            <Text style={styles.dialogSectionLabel}>Reason for Cancellation</Text>
            {REASONS.map((r) => {
              const isSelected = reasonCategory === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReasonCategory(r)}
                  style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Additional Details */}
            <Text style={styles.dialogSectionLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.dialogTextInput, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Tell our concierge if you would like alternative recommendations..."
              placeholderTextColor={Palette.mutedText}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            {/* Refund Method Selection */}
            <Text style={styles.dialogSectionLabel}>Preferred Refund Method</Text>
            <View style={styles.methodChoiceRow}>
              <TouchableOpacity
                onPress={() => setRefundAction('refund')}
                style={[
                  styles.methodCard,
                  refundAction === 'refund' && styles.methodCardSelected,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.methodTitle,
                    refundAction === 'refund' && styles.methodTitleSelected,
                  ]}
                >
                  Original Card (Bachs)
                </Text>
                <Text style={styles.methodSub}>Refunded to bank account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRefundAction('credit')}
                style={[
                  styles.methodCard,
                  refundAction === 'credit' && styles.methodCardSelected,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.methodTitle,
                    refundAction === 'credit' && styles.methodTitleSelected,
                  ]}
                >
                  Platform Credit
                </Text>
                <Text style={styles.methodSub}>Instant credit for future dates</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.confirmSubmitBtn, { backgroundColor: Palette.mulberry }]}
              onPress={handleSubmitRefund}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <BrandLoader color={Palette.porcelain} size="small" />
              ) : (
                <Text style={styles.confirmSubmitBtnText}>Submit Cancellation & Refund</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.keepBookingBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.keepBookingBtnText}>Keep Reservation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENT: HELP & CONCIERGE DRAWER
// ---------------------------------------------------------------------------
function HelpDrawer({
  isOpen,
  onClose,
  initialBookingRef,
  userEmail,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialBookingRef?: string;
  userEmail?: string;
  userName?: string;
}) {
  const [helpTab, setHelpTab] = useState<'faq' | 'ticket'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Ticket Form state
  const [topic, setTopic] = useState('Booking Inquiry');
  const [bookingRef, setBookingRef] = useState(initialBookingRef || '');
  const [message, setMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);

  useEffect(() => {
    if (initialBookingRef) {
      setBookingRef(initialBookingRef);
      setHelpTab('ticket');
    }
  }, [initialBookingRef]);

  const handleTicketSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter your message for the concierge team.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await checkoutService.submitSupportTicket({
        name: userName || 'Customer',
        email: userEmail || 'guest@coupleofoffers.com',
        topic,
        bookingReference: bookingRef,
        message,
      });
      setTicketResult(res.ticketNumber);
      setMessage('');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const text = bookingRef
      ? `Hi Couple Of Offers concierge, I need assistance with booking ${bookingRef}.`
      : 'Hi Couple Of Offers concierge, I have an inquiry regarding date experiences.';
    const url = `https://wa.me/2348000000000?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Unavailable', 'Please submit a ticket or email support@coupleofoffers.com.');
    });
  };

  const handleOpenEmail = () => {
    const subject = bookingRef
      ? `Booking Assistance: ${bookingRef}`
      : 'Couple Of Offers Customer Inquiry';
    Linking.openURL(`mailto:support@coupleofoffers.com?subject=${encodeURIComponent(subject)}`);
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Help & Concierge</Text>
              <Text style={styles.modalSubtitle}>Direct assistance, questions & ticket requests</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <X size={20} color={Palette.aubergine} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogScroll}>
            {/* Direct Concierge Contact Channels */}
            <View style={styles.conciergeChannelsCard}>
              <View style={styles.channelHeaderRow}>
                <Text style={styles.channelHeading}>DIRECT CONCIERGE CHANNELS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={11} color={Palette.mutedText} style={{ marginRight: 4 }} />
                  <Text style={styles.channelHours}>9AM – 9PM WAT</Text>
                </View>
              </View>

              <View style={styles.channelButtonsRow}>
                <TouchableOpacity
                  style={styles.whatsAppChannelBtn}
                  onPress={handleOpenWhatsApp}
                  activeOpacity={0.85}
                >
                  <MessageCircle size={16} color="#128C7E" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsAppChannelBtnText}>Chat on WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emailChannelBtn}
                  onPress={handleOpenEmail}
                  activeOpacity={0.85}
                >
                  <Mail size={16} color={Palette.aubergine} style={{ marginRight: 6 }} />
                  <Text style={styles.emailChannelBtnText}>Email Support</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Help Subtabs: FAQ vs Submit Ticket */}
            <View style={styles.helpTabsRow}>
              <TouchableOpacity
                style={[styles.helpTabBtn, helpTab === 'faq' && styles.helpTabBtnActive]}
                onPress={() => setHelpTab('faq')}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.helpTabBtnText, helpTab === 'faq' && styles.helpTabBtnTextActive]}
                >
                  Frequently Asked Questions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.helpTabBtn, helpTab === 'ticket' && styles.helpTabBtnActive]}
                onPress={() => setHelpTab('ticket')}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.helpTabBtnText, helpTab === 'ticket' && styles.helpTabBtnTextActive]}
                >
                  Submit Ticket
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: FAQ Accordions */}
            {helpTab === 'faq' && (
              <View style={styles.faqList}>
                {FAQS.map((item, idx) => {
                  const isExpanded = expandedFaq === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                      style={styles.faqItem}
                      activeOpacity={0.85}
                    >
                      <View style={styles.faqQuestionRow}>
                        <Text style={styles.faqQuestionText}>{item.q}</Text>
                        {isExpanded ? (
                          <ChevronUp size={16} color={Palette.aubergine} />
                        ) : (
                          <ChevronDown size={16} color={Palette.mutedText} />
                        )}
                      </View>
                      {isExpanded && <Text style={styles.faqAnswerText}>{item.a}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* TAB 2: Submit Ticket Form */}
            {helpTab === 'ticket' && (
              <View style={styles.ticketForm}>
                {ticketResult ? (
                  <View style={styles.ticketSuccessBox}>
                    <CheckCircle2 size={36} color={Palette.mulberry} />
                    <Text style={styles.ticketSuccessTitle}>Support Ticket Received</Text>
                    <Text style={styles.ticketSuccessCode}>Ticket #{ticketResult}</Text>
                    <Text style={styles.ticketSuccessSub}>
                      Our concierge team has received your inquiry and will follow up with you directly via email.
                    </Text>
                    <TouchableOpacity
                      style={styles.newTicketBtn}
                      onPress={() => setTicketResult(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.newTicketBtnText}>Submit Another Inquiry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.dialogSectionLabel}>Inquiry Topic</Text>
                    <View style={styles.topicsGrid}>
                      {[
                        'Booking Inquiry',
                        'Reschedule Help',
                        'Refund Status',
                        'Dietary Request',
                        'Other',
                      ].map((t) => {
                        const isSelected = topic === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => setTopic(t)}
                            style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.topicChipText,
                                isSelected && styles.topicChipTextSelected,
                              ]}
                            >
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.dialogSectionLabel}>Booking Reference (Optional)</Text>
                    <TextInput
                      style={styles.dialogTextInput}
                      placeholder="e.g. COO_357208"
                      placeholderTextColor={Palette.mutedText}
                      value={bookingRef}
                      onChangeText={setBookingRef}
                      autoCapitalize="characters"
                    />

                    <Text style={styles.dialogSectionLabel}>Message for Concierge</Text>
                    <TextInput
                      style={[styles.dialogTextInput, { height: 90, textAlignVertical: 'top' }]}
                      placeholder="Describe what you need assistance with..."
                      placeholderTextColor={Palette.mutedText}
                      multiline
                      value={message}
                      onChangeText={setMessage}
                    />

                    <TouchableOpacity
                      style={styles.confirmSubmitBtn}
                      onPress={handleTicketSubmit}
                      disabled={submittingTicket}
                      activeOpacity={0.88}
                    >
                      {submittingTicket ? (
                        <BrandLoader color={Palette.porcelain} size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Send size={15} color={Palette.porcelain} style={{ marginRight: 6 }} />
                          <Text style={styles.confirmSubmitBtnText}>Send Message to Concierge</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: Palette.porcelain,
  },
  headerBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.3,
  },
  headerBarSub: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 2,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  helpButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  subtabsWrap: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  subtab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  subtabActive: {
    backgroundColor: Palette.porcelain,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subtabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  subtabTextActive: {
    color: Palette.aubergine,
    fontWeight: '800',
  },
  bookingFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bookingFilterChip: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Palette.card,
  },
  bookingFilterChipActive: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  bookingFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mutedText,
  },
  bookingFilterTextActive: {
    color: Palette.porcelain,
  },
  refundsBadge: {
    marginLeft: 6,
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  refundsBadgeText: {
    color: Palette.porcelain,
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130, // Clearance for floating tab bar
  },
  policyHighlightCard: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  policyHighlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  policyHighlightText: {
    fontSize: 11.5,
    color: Palette.mutedText,
    lineHeight: 17,
  },
  bookingCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 14,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusPillConfirmed: {
    backgroundColor: Palette.secondaryBg,
  },
  statusPillRefund: {
    backgroundColor: 'rgba(116, 61, 96, 0.12)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  referenceText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Palette.mutedText,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 3,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  venueText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  paidByText: {
    color: Palette.mulberry,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  arrivalPinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.champagne,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.18)',
  },
  arrivalPinLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.aubergine,
    marginRight: 6,
  },
  arrivalPinDigits: {
    backgroundColor: Palette.porcelain,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  arrivalPinNumber: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    color: Palette.aubergine,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  qrPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  refundInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.2)',
  },
  refundInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  refundInfoSub: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12.5,
    color: Palette.mutedText,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 10,
  },
  cardFooter: {
    gap: 10,
  },
  priceLabel: {
    fontSize: 10.5,
    color: Palette.mutedText,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    width: '100%',
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  passBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.porcelain,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  refundBtnOutline: {
    borderColor: 'rgba(116, 61, 96, 0.3)',
    backgroundColor: 'rgba(116, 61, 96, 0.04)',
  },
  actionBtnOutlineText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  checkStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  checkStatusBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.porcelain,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
    backgroundColor: Palette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  browseBtn: {
    backgroundColor: Palette.aubergine,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  browseBtnText: {
    color: Palette.porcelain,
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingVertical: 9,
  },
  modalHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(48, 29, 50, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherModalContent: {
    padding: 20,
  },
  arrivalPinCard: {
    width: '100%',
    backgroundColor: Palette.champagne,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.18)',
  },
  pinHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Palette.aubergine,
  },
  codeAndQrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 12,
    width: '100%',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.2)',
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  qrScanLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Palette.aubergine,
    marginTop: 4,
    opacity: 0.85,
  },
  pinRightCol: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pinSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Palette.aubergine,
    marginBottom: 6,
    opacity: 0.8,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
  },
  pinDigitBox: {
    width: 35,
    height: 44,
    borderRadius: 10,
    backgroundColor: Palette.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.mulberry,
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pinDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  pinHint: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.aubergine,
    opacity: 0.75,
  },
  pinInstructions: {
    fontSize: 11.5,
    color: Palette.aubergine,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  voucherDetailsCard: {
    width: '100%',
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 16,
  },
  voucherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  voucherDetailLabel: {
    fontSize: 12,
    color: Palette.mutedText,
    flexShrink: 0,
  },
  voucherDetailValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
    flex: 1,
    textAlign: 'right',
  },
  voucherDetailAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  passActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  passSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  passSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  modalDoneBtn: {
    backgroundColor: Palette.aubergine,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: Palette.porcelain,
    fontSize: 14,
    fontWeight: '700',
  },

  // Dialog Specific Styles
  dialogScroll: {
    padding: 20,
  },
  policyNoticeCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  policyNoticeAuto: {
    backgroundColor: Palette.card,
    borderColor: Palette.border,
  },
  policyNoticeManual: {
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    borderColor: 'rgba(116, 61, 96, 0.25)',
  },
  policyNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  policyNoticeText: {
    fontSize: 11.5,
    color: Palette.mutedText,
    lineHeight: 17,
  },
  conciergeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E',
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 14,
  },
  conciergeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  dialogSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.aubergine,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  datePill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    minWidth: 72,
  },
  datePillSelected: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  datePillDay: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  datePillDate: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 2,
  },
  datePillTextSelected: {
    color: Palette.porcelain,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeSlotChipSelected: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  timeSlotChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  timeSlotChipTextSelected: {
    color: Palette.porcelain,
  },
  dialogTextInput: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Palette.aubergine,
    marginBottom: 16,
  },
  confirmSubmitBtn: {
    backgroundColor: Palette.aubergine,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmSubmitBtnText: {
    color: Palette.porcelain,
    fontSize: 14,
    fontWeight: '800',
  },
  keepBookingBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  keepBookingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mutedText,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 8,
  },
  radioItemSelected: {
    borderColor: Palette.mulberry,
    backgroundColor: 'rgba(116, 61, 96, 0.04)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Palette.mutedText,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Palette.mulberry,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Palette.mulberry,
  },
  radioText: {
    fontSize: 12.5,
    color: Palette.aubergine,
    fontWeight: '600',
    flex: 1,
  },
  radioTextSelected: {
    fontWeight: '700',
  },
  methodChoiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  methodCardSelected: {
    borderColor: Palette.mulberry,
    backgroundColor: 'rgba(116, 61, 96, 0.05)',
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  methodTitleSelected: {
    color: Palette.mulberry,
  },
  methodSub: {
    fontSize: 10.5,
    color: Palette.mutedText,
  },

  // Help Modal Specific
  conciergeChannelsCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 16,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  channelHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Palette.aubergine,
  },
  channelHours: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  channelButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsAppChannelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: '#128C7E',
    paddingVertical: 10,
    borderRadius: 12,
  },
  whatsAppChannelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#128C7E',
  },
  emailChannelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emailChannelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  helpTabsRow: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  helpTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  helpTabBtnActive: {
    backgroundColor: Palette.porcelain,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  helpTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  helpTabBtnTextActive: {
    fontWeight: '800',
    color: Palette.aubergine,
  },
  faqList: {
    gap: 8,
    paddingBottom: 16,
  },
  faqItem: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswerText: {
    fontSize: 12,
    color: Palette.mutedText,
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  ticketForm: {
    paddingBottom: 16,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  topicChip: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  topicChipSelected: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  topicChipTextSelected: {
    color: Palette.porcelain,
    fontWeight: '700',
  },
  ticketSuccessBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  ticketSuccessTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 10,
  },
  ticketSuccessCode: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.mulberry,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
    marginBottom: 8,
  },
  ticketSuccessSub: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  newTicketBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Palette.secondaryBg,
  },
  newTicketBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },

  // Auth styles
  unauthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 110,
    backgroundColor: Palette.porcelain,
  },
  unauthContent: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  unauthIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unauthTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 13.5,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  signInPrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.aubergine,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  signInPrimaryBtnText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '700',
  },
  signUpSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  signUpSecondaryBtnText: {
    color: Palette.mulberry,
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Notifications Header Button & Modal Styles
  notifHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: Palette.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#d6b783',
  },
  notifBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2E1805',
  },
  notifModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notifBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifRefText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.mutedText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  notifOfferTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 2,
  },
  notifVenueText: {
    fontSize: 12.5,
    color: Palette.mutedText,
    marginBottom: 12,
  },
  notifPinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.champagne,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  notifPinBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#2E1805',
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  notifPinBannerCode: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#2E1805',
  },
  notifViewPassBtn: {
    backgroundColor: Palette.aubergine,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notifViewPassBtnText: {
    color: Palette.porcelain,
    fontSize: 12,
    fontWeight: '700',
  },
  notifEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 12,
  },
  notifEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 4,
  },
  notifEmptySub: {
    fontSize: 12.5,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifGeneralCard: {
    backgroundColor: Palette.secondaryBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 16,
  },
  notifGeneralTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  notifGeneralBody: {
    fontSize: 11.5,
    color: Palette.mutedText,
    lineHeight: 16,
  },
  notifDoneBtn: {
    backgroundColor: Palette.aubergine,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDoneBtnText: {
    color: Palette.porcelain,
    fontSize: 14,
    fontWeight: '700',
  },
});
