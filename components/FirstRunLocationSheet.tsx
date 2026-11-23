import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapPin,
  Navigation,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { BrandLoader } from './BrandLoader';
import { useLocationStore } from '../store/useLocationStore';

export const FIRST_RUN_STORAGE_KEY = 'coo_has_completed_first_run';

export async function markFirstRunCompleted(): Promise<void> {
  try {
    await SecureStore.setItemAsync(FIRST_RUN_STORAGE_KEY, 'true');
  } catch {
    // Ignore SecureStore failures in restricted environments
  }
  try {
    await AsyncStorage.setItem(FIRST_RUN_STORAGE_KEY, 'true');
  } catch {}
}

export async function hasCompletedFirstRun(): Promise<boolean> {
  try {
    const secureVal = await SecureStore.getItemAsync(FIRST_RUN_STORAGE_KEY);
    if (secureVal === 'true') return true;
  } catch {}
  try {
    const asyncVal = await AsyncStorage.getItem(FIRST_RUN_STORAGE_KEY);
    if (asyncVal === 'true') return true;
  } catch {}
  return false;
}

export const NEIGHBORHOOD_PRESETS = [
  {
    id: 'vi',
    name: 'Victoria Island',
    formattedAddress: 'Victoria Island, Eti-Osa',
    latitude: 6.4281,
    longitude: 3.4219,
    subtitle: 'Fine dining, seaside lounges & intimate bistros',
    tag: 'Waterfront & Upscale',
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    formattedAddress: 'Ikoyi, Eti-Osa',
    latitude: 6.4549,
    longitude: 3.4346,
    subtitle: 'Quiet luxury, garden terraces & heritage dining',
    tag: 'Quiet Luxury',
  },
  {
    id: 'lekki1',
    name: 'Lekki Phase 1',
    formattedAddress: 'Lekki Phase 1, Eti-Osa',
    latitude: 6.4474,
    longitude: 3.4844,
    subtitle: 'Trendy eateries, rooftop dining & vibrant cafes',
    tag: 'Vibrant & Modern',
  },
  {
    id: 'ikeja',
    name: 'Ikeja',
    formattedAddress: 'Ikeja, Ikeja',
    latitude: 6.6018,
    longitude: 3.3515,
    subtitle: 'GRA lounges & relaxed mainland date spots',
    tag: 'Mainland Hub',
  },
];

interface FirstRunLocationSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function FirstRunLocationSheet({ visible, onDismiss }: FirstRunLocationSheetProps) {
  const { selectLocation, detectCurrentLocation, isDetecting } = useLocationStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectPreset = async (preset: typeof NEIGHBORHOOD_PRESETS[number]) => {
    setSelectedId(preset.id);
    await selectLocation({
      name: preset.name,
      formattedAddress: preset.formattedAddress,
      latitude: preset.latitude,
      longitude: preset.longitude,
      isAutoDetected: false,
    });
    await markFirstRunCompleted();
    onDismiss();
  };

  const handleUseGPS = async () => {
    const res = await detectCurrentLocation();
    await markFirstRunCompleted();
    if (res.success) {
      onDismiss();
    } else {
      // If GPS denied/failed, dismiss so user is not blocked
      onDismiss();
    }
  };

  const handleSkip = async () => {
    await markFirstRunCompleted();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleSkip} />

        <View style={styles.sheetContainer}>
          {/* Subtle Grab Handle */}
          <View style={styles.grabBarWrap}>
            <View style={styles.grabBar} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Luxury Welcome Pill */}
            <View style={styles.pillBadge}>
              <Sparkles size={12} color={Palette.goldInk} />
              <Text style={styles.pillBadgeText}>WELCOME TO COUPLE OF OFFERS</Text>
            </View>

            {/* Headline & Friendly Value Subtitle */}
            <Text style={styles.title}>Where are you planning your next date?</Text>
            <Text style={styles.subtitle}>
              Pick your preferred neighborhood to see table reservations, curated multi-course menus, and verified experiences near you.
            </Text>

            {/* Primary Action: GPS Auto-Detect */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleUseGPS}
              disabled={isDetecting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Use current location"
            >
              <View style={styles.gpsIconWrap}>
                {isDetecting ? (
                  <BrandLoader size="small" color={Palette.porcelain} />
                ) : (
                  <Navigation size={18} color={Palette.porcelain} />
                )}
              </View>
              <View style={styles.gpsTextWrap}>
                <Text style={styles.gpsTitle}>
                  {isDetecting ? 'Detecting Your Location...' : 'Use Current Location'}
                </Text>
                <Text style={styles.gpsSub}>
                  Instant physical distance & closest verified tables
                </Text>
              </View>
              <ArrowRight size={16} color={Palette.champagne} style={{ opacity: 0.8 }} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SELECT A NEIGHBORHOOD</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Neighborhood Cards Grid */}
            <View style={styles.neighborhoodGrid}>
              {NEIGHBORHOOD_PRESETS.map((preset) => {
                const isChosen = selectedId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.neighborhoodCard,
                      isChosen && styles.neighborhoodCardChosen,
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardNameRow}>
                        <MapPin
                          size={15}
                          color={isChosen ? Palette.mulberry : Palette.aubergine}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.cardName}>{preset.name}</Text>
                      </View>
                      <View style={styles.cardTag}>
                        <Text style={styles.cardTagText}>{preset.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {preset.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Secondary Action: Skip / Explore all */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Compass size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
              <Text style={styles.skipBtnText}>Explore all Lagos experiences</Text>
              <ArrowRight size={14} color={Palette.mulberry} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Trust reassurance notice */}
            <Text style={styles.helperNote}>
              You can easily change your neighborhood anytime using the location pill at the top of the homepage.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 21, 29, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: Palette.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
  },
  grabBarWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  grabBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#DDD0C8',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3ECE2',
    borderWidth: 1,
    borderColor: '#E5C99A80',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginBottom: 10,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.goldInk,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.aubergine,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18.5,
    color: Palette.mutedText,
    marginBottom: 18,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.aubergine,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  gpsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsTextWrap: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.porcelain,
    marginBottom: 2,
  },
  gpsSub: {
    fontSize: 11.5,
    color: Palette.champagne,
    opacity: 0.9,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD0C8',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.mutedText,
    letterSpacing: 1,
    paddingHorizontal: 12,
  },
  neighborhoodGrid: {
    gap: 10,
    marginBottom: 16,
  },
  neighborhoodCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECE3DC',
    borderRadius: 16,
    padding: 13,
    shadowColor: '#301D32',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  neighborhoodCardChosen: {
    borderColor: Palette.mulberry,
    backgroundColor: '#FAF5ED',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  cardTag: {
    backgroundColor: '#F3ECE2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.goldInk,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Palette.mutedText,
    lineHeight: 16,
    marginLeft: 21,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3ECE2',
    borderWidth: 1,
    borderColor: '#E5C99A70',
    marginTop: 4,
  },
  skipBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.mulberry,
  },
  helperNote: {
    fontSize: 11,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 12,
    opacity: 0.8,
  },
});
