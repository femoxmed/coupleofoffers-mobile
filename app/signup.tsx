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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { BrandWordmark } from '../components/BrandWordmark';
import { useAuthStore } from '../store/useAuthStore';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signup, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Please enter your full name or couple names.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      await signup(
        trimmedEmail,
        password,
        'customer',
        trimmedName
      );

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to create account. Please verify your details.');
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
        {/* Full-Screen Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={styles.backBtn}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={Palette.aubergine} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <BrandWordmark height={28} letterColor={Palette.aubergine} />
          <Text style={styles.title}>Join Couple Of Offers</Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name / Couple Names</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={Palette.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Alex & Jordan"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="words"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
              />
            </View>
          </View>

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
            <Text style={styles.label}>Password (minimum 6 characters)</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Palette.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                placeholder="Create a strong password"
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

          {/* Confirm Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Palette.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={Palette.mutedText}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (error) setError(null);
                }}
              />
            </View>
          </View>

          {/* Perks list for members */}
          <View style={styles.perksCard}>
            <View style={styles.perkItem}>
              <Check size={14} color={Palette.mulberry} strokeWidth={2.8} style={{ marginRight: 8 }} />
              <Text style={styles.perkText}>Instant 4-digit check-in PIN on all bookings</Text>
            </View>
            <View style={styles.perkItem}>
              <Check size={14} color={Palette.mulberry} strokeWidth={2.8} style={{ marginRight: 8 }} />
              <Text style={styles.perkText}>100% upfront guaranteed prices with zero surprise bills</Text>
            </View>
            <View style={styles.perkItem}>
              <Check size={14} color={Palette.mulberry} strokeWidth={2.8} style={{ marginRight: 8 }} />
              <Text style={styles.perkText}>Exclusive VIP partner access & priority reservations</Text>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <BrandLoader color={Palette.porcelain} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Create Free Account</Text>
                <ArrowRight size={18} color={Palette.porcelain} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign In Redirect */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/login');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Security Reassurance */}
        <View style={styles.trustFooter}>
          <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
          <Text style={styles.trustText}>
            By signing up, you agree to Couple Of Offers Terms & Concierge Standards.
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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DBC6',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.4,
    marginTop: 16,
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
    gap: 15,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
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
  perksCard: {
    backgroundColor: Palette.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 8,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkText: {
    fontSize: 11.5,
    color: Palette.aubergine,
    fontWeight: '500',
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    height: 52,
    marginTop: 6,
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
    marginTop: 20,
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
    marginTop: 22,
    paddingHorizontal: 16,
  },
  trustText: {
    fontSize: 11,
    color: Palette.goldInk,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  guestLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  guestLinkText: {
    fontSize: 12,
    color: Palette.mutedText,
    fontWeight: '600',
  },
});
