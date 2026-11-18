import { BrandLoader } from '../../components/BrandLoader';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Heart,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from 'lucide-react-native';
import { Palette } from '../../constants/Colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useSavedStore } from '../../store/useSavedStore';
import { BrandWordmark } from '../../components/BrandWordmark';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuthStore();
  const { savedOffers } = useSavedStore();

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
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your email and password.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Couple Of Offers account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setEmail('');
            setPassword('');
            setError(null);
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: Heart,
      label: 'Saved Experiences',
      badge: savedOffers.length > 0 ? `${savedOffers.length}` : undefined,
      onPress: () => router.push('/saved' as any),
    },
    {
      icon: Bell,
      label: 'Notifications & Date Reminders',
      onPress: () =>
        Alert.alert(
          'Notifications Active',
          'You will receive 24-hour and 2-hour date arrival reminders for your upcoming bookings.'
        ),
    },
    {
      icon: Shield,
      label: 'Security & Payment Standards',
      onPress: () =>
        Alert.alert(
          'Security & Bachs Gateway',
          'All payments are processed with 256-bit bank encryption via Bachs. We never store raw payment card data.'
        ),
    },
    {
      icon: HelpCircle,
      label: 'Concierge & Restaurant Support',
      onPress: () =>
        Alert.alert(
          'Concierge Desk',
          'Need assistance with a booking or custom arrangement? Email concierge@coupleofoffers.com.'
        ),
    },
  ];

  // -------------------------------------------------------------
  // 1. UNLOGGED IN: Render Direct Sign In Screen
  // -------------------------------------------------------------
  if (!user) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.signInScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Wordmark Header */}
          <View style={styles.brandHeader}>
            <BrandWordmark height={28} letterColor={Palette.aubergine} />
            <Text style={styles.signInTitle}>Get Started</Text>
            <Text style={styles.signInSubtitle}>
              Sign in to access your bookings, 4-digit arrival codes, and saved date experiences.
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Sign In Form */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color={Palette.mutedText} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. alex@example.com"
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color={Palette.mutedText} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
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
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={Palette.mutedText} />
                  ) : (
                    <Eye size={16} color={Palette.mutedText} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              style={[styles.signInSubmitBtn, isLoading && { opacity: 0.7 }]}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <BrandLoader color={Palette.porcelain} />
              ) : (
                <View style={styles.submitBtnRow}>
                  <Text style={styles.signInSubmitText}>Sign In</Text>
                  <ArrowRight size={16} color={Palette.porcelain} style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Navigation Option */}
          <View style={styles.signUpPromptCard}>
            <Text style={styles.signUpPromptText}>New to Couple of Offers?</Text>
            <TouchableOpacity
              onPress={() => router.push('/signup')}
              style={styles.createAccountBtn}
              activeOpacity={0.85}
            >
              <UserPlus size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
              <Text style={styles.createAccountBtnText}>Create Free Account</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Banner */}
          <View style={styles.trustBanner}>
            <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
            <Text style={styles.trustBannerText}>
              All-inclusive upfront dining • Zero unexpected bills
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // -------------------------------------------------------------
  // 2. LOGGED IN: Render Full Account & Concierge Dashboard
  // -------------------------------------------------------------
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <User size={30} color={Palette.porcelain} />
        </View>
        <Text style={styles.userName}>{user.name || user.email.split('@')[0]}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>

        <View style={styles.pilotBadge}>
          {user.role === 'restaurant' ? (
            <View style={styles.badgeRow}>
              <Store size={12} color={Palette.goldInk} style={{ marginRight: 4 }} />
              <Text style={styles.pilotBadgeText}>Partner Host</Text>
            </View>
          ) : (
            <View style={styles.badgeRow}>
              <ShieldCheck size={12} color={Palette.goldInk} style={{ marginRight: 4 }} />
              <Text style={styles.pilotBadgeText}>VIP Booker</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Items Card */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Icon size={18} color={Palette.aubergine} style={{ marginRight: 12 }} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.badge ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                <ChevronRight size={18} color={Palette.mutedText} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutButton}
        activeOpacity={0.8}
      >
        <LogOut size={16} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.trustBanner}>
        <ShieldCheck size={14} color={Palette.goldInk} style={{ marginRight: 6 }} />
        <Text style={styles.trustBannerText}>
          Transparent all-inclusive packages • Zero unexpected bills
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  content: {
    padding: 16,
    paddingBottom: 130,
  },
  signInScrollContent: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 130,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  signInTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  signInSubtitle: {
    fontSize: 13,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 19,
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
  formCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
  },
  signInSubmitBtn: {
    backgroundColor: Palette.mulberry,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInSubmitText: {
    color: Palette.porcelain,
    fontSize: 15,
    fontWeight: '700',
  },
  signUpPromptCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    marginBottom: 16,
  },
  signUpPromptText: {
    fontSize: 13,
    color: Palette.mutedText,
    marginBottom: 10,
  },
  createAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.secondaryBg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 61, 96, 0.2)',
  },
  createAccountBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  profileCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.aubergine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.aubergine,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    color: Palette.mutedText,
    marginBottom: 12,
  },
  pilotBadge: {
    backgroundColor: Palette.champagne,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pilotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  menuCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.muted,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  countBadge: {
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  trustBannerText: {
    fontSize: 11,
    color: Palette.mutedText,
    fontWeight: '500',
  },
});
