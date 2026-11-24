import { BrandLoader } from '../components/BrandLoader';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  MapPin,
  User,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type Section = 'password' | 'location' | 'name';

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [activeSection, setActiveSection] = useState<Section | null>(null);

  // ── Change Password ────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  // ── Display Name ───────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [nameBusy, setNameBusy] = useState(false);

  // ── Location ───────────────────────────────────────────────
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);

  // ─────────────────────────────────────────────────────────
  const toggle = (section: Section) =>
    setActiveSection((prev) => (prev === section ? null : section));

  // ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPw) return Alert.alert('Required', 'Enter your current password.');
    if (newPw.length < 8)
      return Alert.alert('Too Short', 'New password must be at least 8 characters.');
    if (newPw !== confirmPw)
      return Alert.alert('Mismatch', 'New passwords do not match.');

    setPwBusy(true);
    try {
      await apiClient('/api/v1/account/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setActiveSection(null);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update password. Please try again.');
    } finally {
      setPwBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  const handleUpdateLocation = async () => {
    if (!city.trim() || !state.trim())
      return Alert.alert('Required', 'Please enter both city and state.');

    setLocationBusy(true);
    try {
      await apiClient('/api/v1/account/location', {
        method: 'PUT',
        body: JSON.stringify({
          address: `${city.trim()}, ${state.trim()}`,
          city: city.trim(),
          state: state.trim(),
        }),
      });
      setActiveSection(null);
      Alert.alert('Location Saved', `Your location has been updated to ${city.trim()}, ${state.trim()}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update location. Please try again.');
    } finally {
      setLocationBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  const handleUpdateName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return Alert.alert('Required', 'Please enter a display name.');

    setNameBusy(true);
    try {
      await apiClient('/api/v1/account/name', {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
      });
      setActiveSection(null);
      Alert.alert('Name Updated', `Your display name is now "${trimmed}".`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update name. Please try again.');
    } finally {
      setNameBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Palette.aubergine} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account info banner */}
        <View style={styles.infoBanner}>
          <User size={15} color={Palette.goldInk} style={{ marginRight: 8 }} />
          <Text style={styles.infoText} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>

        {/* ── SECTION: Display Name ── */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggle('name')}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>Display Name</Text>
          <Text style={styles.sectionChevron}>{activeSection === 'name' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {activeSection === 'name' && (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Full name or couple names</Text>
            <View style={styles.inputRow}>
              <User size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Alex & Jordan"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="words"
                maxLength={80}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, nameBusy && styles.saveBtnDisabled]}
              onPress={handleUpdateName}
              disabled={nameBusy}
              activeOpacity={0.85}
            >
              {nameBusy ? (
                <BrandLoader color={Palette.porcelain} />
              ) : (
                <>
                  <Check size={15} color={Palette.porcelain} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Name</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── SECTION: Change Password ── */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggle('password')}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionChevron}>{activeSection === 'password' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {activeSection === 'password' && (
          <View style={styles.sectionBody}>
            {/* Current */}
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <Lock size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry={!showCurrent}
                placeholder="Current password"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showCurrent ? (
                  <EyeOff size={15} color={Palette.mutedText} />
                ) : (
                  <Eye size={15} color={Palette.mutedText} />
                )}
              </TouchableOpacity>
            </View>

            {/* New */}
            <Text style={[styles.label, { marginTop: 12 }]}>New Password</Text>
            <View style={styles.inputRow}>
              <Lock size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry={!showNew}
                placeholder="At least 8 characters"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showNew ? (
                  <EyeOff size={15} color={Palette.mutedText} />
                ) : (
                  <Eye size={15} color={Palette.mutedText} />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm */}
            <Text style={[styles.label, { marginTop: 12 }]}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <Lock size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                placeholder="Repeat new password"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, pwBusy && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={pwBusy}
              activeOpacity={0.85}
            >
              {pwBusy ? (
                <BrandLoader color={Palette.porcelain} />
              ) : (
                <>
                  <Check size={15} color={Palette.porcelain} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── SECTION: Location ── */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggle('location')}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>My Location</Text>
          <Text style={styles.sectionChevron}>{activeSection === 'location' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {activeSection === 'location' && (
          <View style={styles.sectionBody}>
            <Text style={styles.hint}>
              Helps us show experiences near you and calculate distance badges.
            </Text>

            <Text style={styles.label}>City / Area</Text>
            <View style={styles.inputRow}>
              <MapPin size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Victoria Island"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={80}
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>State</Text>
            <View style={styles.inputRow}>
              <MapPin size={15} color={Palette.mutedText} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="e.g. Lagos"
                placeholderTextColor={Palette.mutedText}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleUpdateLocation}
                maxLength={60}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, locationBusy && styles.saveBtnDisabled]}
              onPress={handleUpdateLocation}
              disabled={locationBusy}
              activeOpacity={0.85}
            >
              {locationBusy ? (
                <BrandLoader color={Palette.porcelain} />
              ) : (
                <>
                  <Check size={15} color={Palette.porcelain} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: Palette.porcelain,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Palette.secondaryBg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.2,
  },
  content: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.champagne + '33',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Palette.champagne + '66',
  },
  infoText: {
    fontSize: 13,
    color: Palette.aubergine,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  sectionChevron: {
    fontSize: 10,
    color: Palette.mutedText,
  },
  sectionBody: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  hint: {
    fontSize: 12,
    color: Palette.mutedText,
    marginBottom: 14,
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mulberry,
    borderRadius: 12,
    height: 46,
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Palette.porcelain,
    fontSize: 14,
    fontWeight: '700',
  },
});
