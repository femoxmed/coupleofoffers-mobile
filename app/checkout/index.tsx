import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  X,
  ExternalLink,
  Calendar,
  Users,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Palette } from '../../constants/Colors';
import { formatNaira } from '../../constants/config';
import { checkoutService, ConfirmedBooking } from '../../services/checkoutService';
import { useAuthStore } from '../../store/useAuthStore';
import { QRCode } from '../../components/QRCode';

export default function MobileBachsCheckoutScreen() {
  const params = useLocalSearchParams<{
    authUrl?: string;
    offerId?: string;
    slotId?: string;
    partySize?: string;
    amountKobo?: string;
    email?: string;
    offerTitle?: string;
    venueName?: string;
    venueAddress?: string;
    slotTime?: string;
    holdId?: string;
  }>();

  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);

  const [authUrl, setAuthUrl] = useState<string | null>(params.authUrl || null);
  const [loading, setLoading] = useState(!params.authUrl);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [arrivalPin, setArrivalPin] = useState<string>('7429');
  const [reference, setReference] = useState<string>(
    `coo_${Date.now().toString().slice(-6)}`
  );
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 min hold timer

  const amountKobo = Number(params.amountKobo) || 4600000;
  const partySize = Number(params.partySize) || 2;
  const userEmail = (params.email || authUser?.email || 'guest@coupleofoffers.ng').trim();

  // 5-minute hold timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Bachs session if authUrl was not pre-passed
  useEffect(() => {
    if (authUrl) return;

    let active = true;
    async function initCheckout() {
      setLoading(true);
      setError(null);
      try {
        const res = await checkoutService.initBachsCheckout({
          offerId: params.offerId || 'offer-1',
          slotId: params.slotId,
          partySize,
          totalKobo: amountKobo,
          email: userEmail,
          offerTitle: params.offerTitle,
          venueName: params.venueName,
          venueAddress: params.venueAddress,
          slotTime: params.slotTime,
        });

        if (active) {
          setAuthUrl(res.authorizationUrl);
          setReference(res.reference);
          setArrivalPin(res.arrivalPin);
        }
      } catch (err: any) {
        console.error('Mobile Bachs checkout init error:', err);
        if (active) {
          setError(
            err?.message || 'Could not connect to Bachs secure gateway. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initCheckout();
    return () => {
      active = false;
    };
  }, [authUrl, params.offerId, params.slotId, partySize, amountKobo, userEmail]);

  const handlePaymentSuccess = async () => {
    if (paymentSuccess) return;
    setPaymentSuccess(true);

    // Save confirmed booking to persistent local store
    const booking: ConfirmedBooking = {
      id: reference,
      reference,
      offerId: params.offerId || 'offer-1',
      offerTitle: params.offerTitle || 'Curated Date Experience',
      venueName: cleanVenue(params.venueName || 'Partner Venue'),
      venueAddress: cleanVenue(params.venueAddress || ''),
      partySize,
      amountKobo,
      email: userEmail,
      slotTime: params.slotTime || 'Today, 8:00 PM',
      arrivalPin,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    await checkoutService.saveBooking(booking);
  };

  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url || '';
    // Intercept Bachs success redirects
    if (
      url.includes('/booking/confirmation') ||
      url.includes('status=success') ||
      url.includes('status=successful') ||
      url.includes('trxref=') ||
      url.includes('checkout.completed')
    ) {
      handlePaymentSuccess();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Leave Checkout?',
      'Your reserved dining slot may be released if you exit now.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleOpenExternal = async () => {
    if (!authUrl) return;
    try {
      await WebBrowser.openBrowserAsync(authUrl);
    } catch {
      Alert.alert('Browser', 'Unable to open external browser.');
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  function cleanVenue(text: string) {
    return text
      .replace(/Sample\s*Lagos\s*experiences/gi, 'Curated Experiences')
      .replace(/,\s*Lagos.*$/i, '')
      .replace(/Lagos/gi, '')
      .replace(/[\s•\-–—]*demo\b/gi, '')
      .trim();
  }

  // Confirmed booking celebration screen
  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.successSafe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={styles.successScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={54} color={Palette.mulberry} strokeWidth={2.4} />
            </View>

            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your dining experience at{' '}
              <Text style={{ fontWeight: '700', color: Palette.aubergine }}>
                {cleanVenue(params.venueName || 'Partner Venue')}
              </Text>{' '}
              is reserved.
            </Text>

            {/* 4-Digit Arrival Code & QR Scan Pass Golden Card */}
            <View style={styles.arrivalPinCard}>
              <View style={styles.pinHeaderRow}>
                <Text style={styles.pinHeaderLabel}>YOUR ARRIVAL CHECK-IN CODE</Text>
              </View>

              <View style={styles.codeAndQrRow}>
                {/* QR Code Scan Pass */}
                <View style={styles.qrContainer}>
                  <View style={styles.qrBox}>
                    <QRCode
                      value={`https://coupleofoffers.ng/partner?code=${arrivalPin}&ref=${reference}`}
                      size={80}
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
                    {arrivalPin.split('').map((digit, idx) => (
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

            {/* Receipt Breakdown Card */}
            <View style={styles.receiptSummary}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference Number</Text>
                <Text
                  style={styles.receiptValue}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  selectable
                >
                  {reference.toUpperCase().startsWith('COO_')
                    ? reference.toUpperCase()
                    : reference.length > 14
                    ? reference.slice(-10).toUpperCase()
                    : reference.toUpperCase()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Experience</Text>
                <Text style={styles.receiptValue} numberOfLines={1}>
                  {params.offerTitle || 'Date Package'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date & Time</Text>
                <Text style={styles.receiptValue}>
                  {params.slotTime || 'Reserved Slot'} • {partySize}{' '}
                  {partySize === 1 ? 'Guest' : 'Guests'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Paid via Bachs</Text>
                <Text style={styles.receiptAmount}>{formatNaira(amountKobo)}</Text>
              </View>
            </View>

            <Text style={styles.confirmationDeliveryNote}>
              Confirmation & arrival code delivered to{' '}
              <Text style={{ fontWeight: '600' }}>{userEmail}</Text>
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primaryDoneBtn}
              onPress={() => router.replace('/(tabs)/bookings')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryDoneBtnText}>View in My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryDoneBtn}
              onPress={() => router.replace('/(tabs)/explore')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryDoneBtnText}>Explore More Experiences</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />

      {/* Luxury Full Screen Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.backButton}
          activeOpacity={0.75}
          hitSlop={12}
        >
          <X size={20} color={Palette.aubergine} />
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.secureBadge}>
            <Lock size={12} color={Palette.goldInk} style={{ marginRight: 4 }} />
            <Text style={styles.secureBadgeText}>Bachs Secure Payment</Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {params.offerTitle || 'Experience Checkout'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOpenExternal}
          style={styles.externalButton}
          activeOpacity={0.75}
          hitSlop={12}
        >
          <ExternalLink size={18} color={Palette.aubergine} />
        </TouchableOpacity>
      </View>

      {/* Hold Expiry Bar */}
      <View style={styles.timerBar}>
        <View style={styles.timerRow}>
          <Lock size={13} color={Palette.mulberry} style={{ marginRight: 6 }} />
          <Text style={styles.timerText}>
            Table held for{' '}
            <Text style={{ fontWeight: '800', color: Palette.aubergine }}>
              {formatTimer(secondsRemaining)}
            </Text>
          </Text>
        </View>
        <Text style={styles.holdNotice}>256-bit SSL Encrypted</Text>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.mulberry} />
          <Text style={styles.loadingTitle}>Connecting to Bachs</Text>
          <Text style={styles.loadingSub}>
            Generating your encrypted checkout form...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not load checkout</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setAuthUrl(null);
            }}
            activeOpacity={0.85}
          >
            <RefreshCw size={16} color={Palette.porcelain} style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backErrorButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backErrorButtonText}>Return to Experience</Text>
          </TouchableOpacity>
        </View>
      ) : authUrl ? (
        /* Full Screen Bachs Checkout WebView */
        <View style={styles.webViewWrap}>
          <WebView
            source={{ uri: authUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoader}>
                <ActivityIndicator size="large" color={Palette.mulberry} />
                <Text style={styles.webViewLoaderText}>Loading Bachs Checkout...</Text>
              </View>
            )}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webView}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  headerBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DBC6',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  headerCenter: {
    alignItems: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Palette.mutedText,
    marginTop: 1,
    maxWidth: 180,
  },
  externalButton: {
    padding: 4,
  },
  timerBar: {
    backgroundColor: Palette.champagne,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(116, 61, 96, 0.12)',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 12,
    color: Palette.aubergine,
  },
  holdNotice: {
    fontSize: 11,
    color: Palette.mulberry,
    fontWeight: '600',
  },
  webViewWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
  },
  webViewLoader: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  webViewLoaderText: {
    fontSize: 13,
    color: Palette.mutedText,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.aubergine,
    marginTop: 8,
  },
  loadingSub: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.mulberry,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
  },
  retryButtonText: {
    color: Palette.porcelain,
    fontSize: 14,
    fontWeight: '700',
  },
  backErrorButton: {
    paddingVertical: 8,
  },
  backErrorButtonText: {
    fontSize: 13,
    color: Palette.mutedText,
    fontWeight: '600',
  },
  successSafe: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  successScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  successContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: Palette.mutedText,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
    maxWidth: 320,
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
  receiptSummary: {
    width: '100%',
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  receiptLabel: {
    fontSize: 12,
    color: Palette.mutedText,
    flexShrink: 0,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
    flex: 1,
    textAlign: 'right',
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.mulberry,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.muted,
    marginVertical: 10,
  },
  confirmationDeliveryNote: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryDoneBtn: {
    width: '100%',
    backgroundColor: Palette.aubergine,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryDoneBtnText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryDoneBtn: {
    paddingVertical: 8,
  },
  secondaryDoneBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.mulberry,
  },
});
