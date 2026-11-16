import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { checkoutService, type ConfirmedBooking } from '../services/checkoutService';
import { formatNaira } from '../constants/config';
import { Palette } from '../constants/Colors';
export function UnpaidBookingCard({ booking, refresh }: { booking: ConfirmedBooking; refresh: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const resume = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await checkoutService.resumeBooking(booking.reference);
      if (!result.authorizationUrl) { refresh(); Alert.alert('Booking updated', 'Check your bookings for the latest payment status.'); return; }
      router.push({ pathname: '/checkout', params: { authUrl: result.authorizationUrl, reference: result.reference, offerId: booking.offerId, amountKobo: String(booking.amountKobo), partySize: String(booking.partySize), email: booking.email, offerTitle: booking.offerTitle, venueName: booking.venueName, slotTime: booking.slotTime } });
    } catch (error) { Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Refresh your bookings and try again.'); refresh(); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <Text style={styles.label}>AWAITING PAYMENT</Text>
    <Text style={styles.title}>{booking.offerTitle}</Text>
    <Text style={styles.copy}>{booking.venueName} · {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}</Text>
    <Text style={styles.price}>{formatNaira(booking.amountKobo)}</Text>
    {booking.checkoutExpiresAt && <Text style={styles.copy}>Leaves this list {new Date(booking.checkoutExpiresAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</Text>}
    <TouchableOpacity accessibilityRole="button" disabled={busy || booking.canResume === false} onPress={resume} style={[styles.button, (busy || booking.canResume === false) && { opacity: 0.5 }]}><Text style={styles.buttonText}>{booking.canResume === false ? 'Arrival time unavailable' : busy ? 'Checking availability…' : 'Complete checkout'}</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.border, borderRadius: 20, padding: 20, marginBottom: 12 },
  label: { fontSize: 9, letterSpacing: 1.3, fontWeight: '800', color: Palette.goldInk },
  title: { marginTop: 10, fontSize: 18, fontWeight: '800', color: Palette.aubergine },
  copy: { fontSize: 12, lineHeight: 19, color: Palette.mutedText, marginTop: 5 },
  price: { fontSize: 22, fontWeight: '800', color: Palette.aubergine, marginVertical: 12 },
  button: { backgroundColor: Palette.mulberry, borderRadius: 24, padding: 14, marginTop: 15, alignItems: 'center' },
  buttonText: { color: Palette.porcelain, fontWeight: '700', fontSize: 13 },
});
