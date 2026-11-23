import { BrandLoader } from '../components/BrandLoader';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, X, ShieldCheck } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { BrandWordmark } from '../components/BrandWordmark';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    intent?: string;
    offerId?: string;
    slotId?: string;
    partySize?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      await login(trimmedEmail, password);
      if (params.returnTo) {
        router.replace({
          pathname: params.returnTo as any,
          params: {
            intent: params.intent,
            slotId: params.slotId,
            partySize: params.partySize,
            offerId: params.offerId,
          },
        });
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your email and password.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Dismiss */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={styles.closeBtn}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <X size={20} color={Palette.aubergine} />
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <BrandWordmark height={28} letterColor={Palette.aubergine} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your bookings, saved date experiences, and VIP dining privileges.
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Palette.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@coupleofoffers.com"
                placeholderTextColor={Palette.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError(null);
                }}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Palette.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                placeholder="Enter your password"
                placeholderTextColor={Palette.mutedText}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (error) setError(null);
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={10}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Palette.mutedText} />
                ) : (
                  <Eye size={18} color={Palette.mutedText} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <BrandLoader color={Palette.porcelain} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <ArrowRight size={18} color={Palette.porcelain} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign Up Redirect */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account yet?</Text>
          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/signup', params })}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Security / Upfront Reassurance */}
        <View style={styles.trustFooter}>
          <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
          <Text style={styles.trustText}>
            256-bit encrypted authentication • Verified upfront packages
          </Text>
        </View>

        {/* Continue as Guest */}
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          style={styles.guestLink}
          activeOpacity={0.7}
        >
          <Text style={styles.guestLinkText}>Continue browsing as guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(48, 29, 50, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
    marginTop: 16,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
    height: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    height: 52,
    marginTop: 8,
    shadowColor: Palette.mulberry,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: Palette.mutedText,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.mulberry,
    textDecorationLine: 'underline',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  trustText: {
    fontSize: 11,
    color: Palette.goldInk,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestLink: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  guestLinkText: {
    fontSize: 12,
    color: Palette.mutedText,
    fontWeight: '600',
  },
});
