import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { BrandWordmark } from '../components/BrandWordmark';
import { BrandLoader } from '../components/BrandLoader';
import { apiClient } from '../services/apiClient';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();

  const email = params.email || '';
  const returnTo = (params.returnTo as string | undefined) || '/(tabs)/bookings';

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResent(false);
    try {
      await apiClient('/api/v1/account/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } catch (err: any) {
      Alert.alert(
        'Could Not Resend',
        err?.message || 'Please wait a moment and try again.',
      );
    } finally {
      setResending(false);
    }
  };

  const handleOpenMail = () => {
    Linking.openURL('message://').catch(() =>
      Linking.openURL('mailto:').catch(() => null),
    );
  };

  const handleContinue = () => {
    router.replace(returnTo as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.inner}>
        {/* Brand */}
        <BrandWordmark height={26} letterColor={Palette.aubergine} />

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Mail size={44} color={Palette.mulberry} />
        </View>

        {/* Copy */}
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailHighlight}>{email || 'your email address'}</Text>.
          {'\n\n'}
          Tap the link to activate your account. You can still browse and
          book while you wait — your account is fully active.
        </Text>

        {/* Open Mail App */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleOpenMail}
          activeOpacity={0.88}
        >
          <Mail size={16} color={Palette.porcelain} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Open Mail App</Text>
          <ArrowRight size={15} color={Palette.porcelain} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Continue without verifying */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Continue to App</Text>
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive it? </Text>
          {resending ? (
            <BrandLoader color={Palette.mulberry} size="small" />
          ) : resent ? (
            <View style={styles.resentConfirm}>
              <CheckCircle size={14} color={Palette.mulberry} style={{ marginRight: 4 }} />
              <Text style={styles.resentText}>Sent!</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <View style={styles.resendBtn}>
                <RefreshCw size={13} color={Palette.mulberry} style={{ marginRight: 4 }} />
                <Text style={styles.resendBtnText}>Resend Email</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.spamNote}>
          Check your spam or junk folder if you don't see it.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(116,61,96,0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
    marginBottom: 14,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    color: Palette.aubergine,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    height: 52,
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '700',
  },
  continueBtn: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    marginBottom: 28,
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resendPrompt: {
    fontSize: 13,
    color: Palette.mutedText,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  resentConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resentText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  spamNote: {
    fontSize: 11.5,
    color: Palette.mutedText,
    textAlign: 'center',
    opacity: 0.7,
  },
});
