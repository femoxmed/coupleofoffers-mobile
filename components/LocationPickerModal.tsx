import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import {
  useLocationStore,
  UserLocation,
  AddressSuggestion,
} from '../store/useLocationStore';

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
    isLoadingSuggestions,
    suggestions,
    errorMsg,
    detectCurrentLocation,
    fetchAddressSuggestions,
    clearSuggestions,
    selectLocation,
    clearError,
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced address suggestion fetching as user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      clearSuggestions();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(query);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, fetchAddressSuggestions, clearSuggestions]);

  // Clean up on modal open/close
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setLocalError(null);
      clearError();
      clearSuggestions();
    }
  }, [visible, clearError, clearSuggestions]);

  const handleDetectGPS = async () => {
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

  const handleSelectSuggestion = async (item: AddressSuggestion) => {
    setLocalError(null);
    clearError();

    await selectLocation({
      name: item.shortName,
      formattedAddress: item.fullAddress,
      latitude: item.latitude,
      longitude: item.longitude,
      isAutoDetected: false,
    });

    const chosen: UserLocation = {
      name: item.shortName,
      formattedAddress: item.fullAddress,
      latitude: item.latitude,
      longitude: item.longitude,
      isAutoDetected: false,
      updatedAt: new Date().toISOString(),
    };

    onLocationSelected?.(chosen);
    onClose();
  };

  const displayError = localError || errorMsg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Grab Handle */}
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
                <Text style={styles.headerSub}>Find experiences & venues near you</Text>
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
              onPress={handleDetectGPS}
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
                  {isDetecting ? 'Detecting Location...' : 'Use Current Location'}
                </Text>
                <Text style={styles.detectSub}>
                  {isDetecting
                    ? 'Acquiring GPS coordinates & reverse geocoding...'
                    : 'Auto-detect via GPS and find nearby tables'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Address Search Input */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionLabel}>Search Address or Neighborhood</Text>
              <View style={styles.searchBox}>
                <Search size={16} color={Palette.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type street, landmark or area..."
                  placeholderTextColor={Palette.mutedText}
                  value={searchQuery}
                  onChangeText={(t) => {
                    setSearchQuery(t);
                    if (displayError) setLocalError(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {isLoadingSuggestions && (
                  <ActivityIndicator size="small" color={Palette.mulberry} style={{ marginRight: 6 }} />
                )}
                {searchQuery.length > 0 && !isLoadingSuggestions && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      clearSuggestions();
                    }}
                    hitSlop={8}
                  >
                    <X size={15} color={Palette.mutedText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Live Autocomplete Suggestions List */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsHeader}>Suggested Addresses</Text>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.suggestionIconWrap}>
                      <MapPin size={15} color={Palette.mulberry} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionPrimary} numberOfLines={1}>
                        {item.primaryText}
                      </Text>
                      {item.secondaryText ? (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State when typing but no results */}
            {searchQuery.trim().length >= 3 && !isLoadingSuggestions && suggestions.length === 0 && (
              <View style={styles.emptySuggestions}>
                <Text style={styles.emptySuggestionsTitle}>No address matches found</Text>
                <Text style={styles.emptySuggestionsSub}>
                  Try typing a specific street name, landmark, or neighborhood.
                </Text>
              </View>
            )}

            {/* Currently Saved Location Card (Complete with Coordinates & Full Address) */}
            <View style={styles.savedSection}>
              <Text style={styles.sectionLabel}>Currently Saved Location</Text>
              <View style={styles.currentCard}>
                <View style={styles.currentCardTop}>
                  <View style={styles.currentCardHeaderLeft}>
                    <Compass size={14} color={Palette.mulberry} style={{ marginRight: 6 }} />
                    <Text style={styles.currentCardTitle}>{currentLocation.name}</Text>
                  </View>
                  {currentLocation.isAutoDetected ? (
                    <View style={styles.gpsBadge}>
                      <Text style={styles.gpsBadgeText}>GPS Active</Text>
                    </View>
                  ) : (
                    <View style={styles.manualBadge}>
                      <Text style={styles.manualBadgeText}>Saved Address</Text>
                    </View>
                  )}
                </View>

                {/* Full Address */}
                <Text style={styles.currentCardFullAddress}>
                  {currentLocation.formattedAddress || currentLocation.name}
                </Text>

                {/* Coordinates Row */}
                <View style={styles.coordsRow}>
                  <Text style={styles.coordsLabel}>
                    Coordinates: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
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
    maxHeight: '90%',
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
    marginBottom: 14,
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
    height: 48,
    borderWidth: 1.5,
    borderColor: Palette.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.aubergine,
    paddingVertical: 0,
  },
  suggestionsContainer: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 6,
    marginBottom: 18,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Palette.mutedText,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionPrimary: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  suggestionSecondary: {
    fontSize: 11.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  emptySuggestions: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptySuggestionsTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 4,
  },
  emptySuggestionsSub: {
    fontSize: 12,
    color: Palette.mutedText,
    textAlign: 'center',
  },
  savedSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  currentCard: {
    backgroundColor: Palette.card,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.border,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  currentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  currentCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  currentCardFullAddress: {
    fontSize: 12.5,
    color: Palette.mutedText,
    lineHeight: 18,
    marginBottom: 8,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  coordsLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Palette.mulberry,
    fontWeight: '600',
  },
  gpsBadge: {
    backgroundColor: Palette.champagne,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6b783',
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E1805',
  },
  manualBadge: {
    backgroundColor: Palette.secondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.aubergine,
  },
});
