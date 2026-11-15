import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { useLocationStore, POPULAR_AREAS, UserLocation } from '../store/useLocationStore';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected?: (location: UserLocation) => void;
}

export function LocationPickerModal({
  visible,
  onClose,
  onLocationSelected,
}: LocationPickerModalProps) {
  const {
    currentLocation,
    isDetecting,
    errorMsg,
    detectCurrentLocation,
    setManualLocation,
    geocodeAndSetLocation,
    clearError,
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDetect = async () => {
    setLocalError(null);
    clearError();
    const res = await detectCurrentLocation();
    if (res.success && res.location) {
      onLocationSelected?.(res.location);
      onClose();
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleSelectArea = async (areaName: string) => {
    setLocalError(null);
    clearError();
    await setManualLocation(areaName);
    const updated: UserLocation = {
      name: areaName,
      formattedAddress: areaName,
      isAutoDetected: false,
      updatedAt: new Date().toISOString(),
    };
    onLocationSelected?.(updated);
    onClose();
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    setLocalError(null);
    clearError();
    setIsSearching(true);

    const res = await geocodeAndSetLocation(searchQuery.trim());
    setIsSearching(false);

    if (res.success && res.location) {
      setSearchQuery('');
      onLocationSelected?.(res.location);
      onClose();
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const displayError = localError || errorMsg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Grab Bar */}
          <View style={styles.grabBarWrap}>
            <View style={styles.grabBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <MapPin size={18} color={Palette.aubergine} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Select Location</Text>
                <Text style={styles.headerSub}>Find dates & experiences near you</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <X size={16} color={Palette.mutedText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {displayError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={Palette.mulberry} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* GPS Auto-Detect Button */}
            <TouchableOpacity
              style={styles.detectBtn}
              onPress={handleDetect}
              disabled={isDetecting}
              activeOpacity={0.85}
            >
              <View style={styles.detectIconWrap}>
                {isDetecting ? (
                  <ActivityIndicator size="small" color={Palette.mulberry} />
                ) : (
                  <Navigation size={18} color={Palette.mulberry} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectTitle}>
                  {isDetecting ? 'Detecting Your Location...' : 'Use Current Location'}
                </Text>
                <Text style={styles.detectSub}>
                  {isDetecting
                    ? 'Using GPS & Geocoding to locate your area'
                    : 'Tap to automatically detect your neighborhood via GPS'}
                </Text>
              </View>
              <Sparkles size={16} color={Palette.champagne} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {/* Search or Type Address Box */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionLabel}>Or Search Neighborhood</Text>
              <View style={styles.searchBox}>
                <Search size={16} color={Palette.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="e.g. Ikoyi, Victoria Island, Ikeja..."
                  placeholderTextColor={Palette.mutedText}
                  value={searchQuery}
                  onChangeText={(t) => {
                    setSearchQuery(t);
                    if (displayError) setLocalError(null);
                  }}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoCapitalize="words"
                />
                {searchQuery.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.searchSubmitBtn}
                    onPress={handleSearchSubmit}
                    disabled={isSearching}
                    activeOpacity={0.8}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color={Palette.porcelain} />
                    ) : (
                      <ArrowRight size={14} color={Palette.porcelain} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Curated Popular Areas */}
            <View style={styles.popularSection}>
              <Text style={styles.sectionLabel}>Popular Areas</Text>
              <View style={styles.areasGrid}>
                {POPULAR_AREAS.map((area) => {
                  const isSelected =
                    currentLocation.name.toLowerCase() === area.toLowerCase();

                  return (
                    <TouchableOpacity
                      key={area}
                      style={[
                        styles.areaChip,
                        isSelected && styles.areaChipSelected,
                      ]}
                      onPress={() => handleSelectArea(area)}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <Check size={14} color={Palette.porcelain} style={{ marginRight: 5 }} />
                      ) : (
                        <MapPin size={12} color={Palette.mutedText} style={{ marginRight: 5 }} />
                      )}
                      <Text
                        style={[
                          styles.areaChipText,
                          isSelected && styles.areaChipTextSelected,
                        ]}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Active Saved Location Card */}
            <View style={styles.currentCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentCardLabel}>CURRENTLY SAVED</Text>
                <Text style={styles.currentCardName}>{currentLocation.name}</Text>
                {currentLocation.formattedAddress &&
                  currentLocation.formattedAddress !== currentLocation.name && (
                    <Text style={styles.currentCardAddr} numberOfLines={1}>
                      {currentLocation.formattedAddress}
                    </Text>
                  )}
              </View>
              {currentLocation.isAutoDetected && (
                <View style={styles.gpsBadge}>
                  <Text style={styles.gpsBadgeText}>GPS Verified</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 21, 29, 0.65)',
  },
  sheetContainer: {
    backgroundColor: Palette.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  grabBarWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  grabBar: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(48, 29, 50, 0.22)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBEBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3C5C5',
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12.5,
    color: Palette.aubergine,
    flex: 1,
    lineHeight: 16,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.border,
    marginBottom: 18,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detectIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detectTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  detectSub: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  searchSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Palette.mutedText,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
    paddingVertical: 0,
  },
  searchSubmitBtn: {
    backgroundColor: Palette.aubergine,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  popularSection: {
    marginBottom: 18,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  areaChipSelected: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  areaChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  areaChipTextSelected: {
    color: Palette.porcelain,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: 4,
  },
  currentCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Palette.mulberry,
    marginBottom: 2,
  },
  currentCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  currentCardAddr: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  gpsBadge: {
    backgroundColor: Palette.champagne,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6b783',
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E1805',
  },
});
