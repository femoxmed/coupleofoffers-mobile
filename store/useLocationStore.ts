import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const LOCATION_STORAGE_KEY = 'coo_user_location';

export interface UserLocation {
  name: string;             // Clean short neighborhood / display label (e.g. "Victoria Island", "Adeola Odeku St")
  formattedAddress: string; // Complete full address
  latitude: number;         // Exact latitude
  longitude: number;        // Exact longitude
  isAutoDetected: boolean;  // True if obtained via device GPS
  updatedAt: string;        // ISO timestamp
}

export interface AddressSuggestion {
  id: string;
  primaryText: string;     // e.g. "Adeola Odeku Street"
  secondaryText: string;   // e.g. "Victoria Island, Eti-Osa"
  fullAddress: string;     // Complete address line
  latitude: number;
  longitude: number;
  shortName: string;       // Neighborhood or short title
}

interface LocationState {
  currentLocation: UserLocation;
  isDetecting: boolean;
  isLoadingSuggestions: boolean;
  suggestions: AddressSuggestion[];
  errorMsg: string | null;

  // Actions
  initLocation: () => Promise<void>;
  detectCurrentLocation: () => Promise<{ success: boolean; location?: UserLocation; error?: string }>;
  fetchAddressSuggestions: (query: string) => Promise<AddressSuggestion[]>;
  clearSuggestions: () => void;
  selectLocation: (loc: {
    name: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
    isAutoDetected?: boolean;
  }) => Promise<void>;
  clearError: () => void;
}

// Default fallback coordinates (Victoria Island)
const DEFAULT_LOCATION: UserLocation = {
  name: 'Victoria Island',
  formattedAddress: 'Victoria Island, Eti-Osa',
  latitude: 6.4281,
  longitude: 3.4219,
  isAutoDetected: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Sanitizes address strings to strictly comply with rules (strictly no mention of Lagos).
 */
export function sanitizeAddressString(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\bLagos\b/gi, '')
    .replace(/\bNigeria\b/gi, '')
    .replace(/\s*,\s*,/g, ',')
    .replace(/^[,\s-]+/, '')
    .replace(/[,\s-]+$/, '')
    .trim();
}

/**
 * Extracts a concise display name / neighborhood from an address object.
 */
function extractShortName(
  primary: string,
  district?: string | null,
  subregion?: string | null
): string {
  const cleanDistrict = sanitizeAddressString(district);
  const cleanSubregion = sanitizeAddressString(subregion);
  const cleanPrimary = sanitizeAddressString(primary);

  // If district exists (e.g. Victoria Island, Ikoyi, Lekki Phase 1), prefer it for top masthead pill
  if (cleanDistrict && cleanDistrict.length > 2) {
    return cleanDistrict;
  }
  if (cleanSubregion && cleanSubregion.length > 2) {
    return cleanSubregion;
  }
  return cleanPrimary || 'Victoria Island';
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: DEFAULT_LOCATION,
  isDetecting: false,
  isLoadingSuggestions: false,
  suggestions: [],
  errorMsg: null,

  initLocation: async () => {
    try {
      const raw = await SecureStore.getItemAsync(LOCATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserLocation;
        if (parsed?.name && Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) {
          set({ currentLocation: parsed });
        }
      }
    } catch {
      // Keep default
    }
  },

  detectCurrentLocation: async () => {
    set({ isDetecting: true, errorMsg: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const error = 'Location permission was denied. Please search and select your address.';
        set({ isDetecting: false, errorMsg: error });
        return { success: false, error };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      let shortName = 'Victoria Island';
      let fullAddress = 'Victoria Island';

      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseResults && reverseResults.length > 0) {
          const addr = reverseResults[0];
          const street = sanitizeAddressString(addr.street);
          const name = sanitizeAddressString(addr.name);
          const district = sanitizeAddressString(addr.district);
          const subregion = sanitizeAddressString(addr.subregion);

          shortName = district || subregion || street || name || 'Victoria Island';

          const addressParts = [name || street, district, subregion]
            .filter(Boolean)
            .map((p) => sanitizeAddressString(p))
            .filter(Boolean);

          // Deduplicate parts
          const uniqueParts = Array.from(new Set(addressParts));
          fullAddress = uniqueParts.join(', ') || shortName;
        }
      } catch {
        shortName = 'Victoria Island';
        fullAddress = 'Victoria Island';
      }

      const newLocation: UserLocation = {
        name: shortName,
        formattedAddress: fullAddress,
        latitude,
        longitude,
        isAutoDetected: true,
        updatedAt: new Date().toISOString(),
      };

      set({
        currentLocation: newLocation,
        isDetecting: false,
        errorMsg: null,
      });

      await SecureStore.setItemAsync(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
      return { success: true, location: newLocation };
    } catch (err: any) {
      const error = err?.message || 'Unable to detect current location.';
      set({ isDetecting: false, errorMsg: error });
      return { success: false, error };
    }
  },

  fetchAddressSuggestions: async (query: string): Promise<AddressSuggestion[]> => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      set({ suggestions: [], isLoadingSuggestions: false });
      return [];
    }

    set({ isLoadingSuggestions: true });

    try {
      // 1. Query Photon Geocoding API (Fast OSM autocomplete optimized for typeahead)
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        trimmed
      )}&limit=7&lang=en`;

      const response = await fetch(photonUrl, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const features = data?.features || [];

        if (features.length > 0) {
          const items: AddressSuggestion[] = features
            .map((f: any, idx: number) => {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates || [];
              const lon = coords[0];
              const lat = coords[1];

              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

              const name = sanitizeAddressString(props.name || props.street);
              const district = sanitizeAddressString(props.district || props.city || props.county);
              const state = sanitizeAddressString(props.state);

              const primaryText = name || district || trimmed;
              const secondaryParts = [district !== primaryText ? district : null, state]
                .filter(Boolean)
                .map((p) => sanitizeAddressString(p))
                .filter(Boolean);

              const secondaryText = Array.from(new Set(secondaryParts)).join(', ');
              const fullAddress = [primaryText, secondaryText].filter(Boolean).join(', ');
              const shortName = extractShortName(primaryText, props.district, props.city);

              return {
                id: `photon-${idx}-${lat}-${lon}`,
                primaryText,
                secondaryText,
                fullAddress,
                latitude: lat,
                longitude: lon,
                shortName,
              };
            })
            .filter((item: AddressSuggestion | null): item is AddressSuggestion => item !== null);

          if (items.length > 0) {
            set({ suggestions: items, isLoadingSuggestions: false });
            return items;
          }
        }
      }

      // 2. Fallback to native expo-location geocoding
      const nativeResults = await Location.geocodeAsync(trimmed);
      if (nativeResults && nativeResults.length > 0) {
        const fallbackItems: AddressSuggestion[] = [];

        for (let i = 0; i < Math.min(nativeResults.length, 4); i++) {
          const res = nativeResults[i];
          let primaryText = trimmed;
          let secondaryText = '';
          let shortName = trimmed;

          try {
            const rev = await Location.reverseGeocodeAsync({
              latitude: res.latitude,
              longitude: res.longitude,
            });
            if (rev && rev.length > 0) {
              const a = rev[0];
              const street = sanitizeAddressString(a.street || a.name);
              const dist = sanitizeAddressString(a.district || a.subregion);
              if (street) primaryText = street;
              if (dist) {
                secondaryText = dist;
                shortName = dist;
              }
            }
          } catch {
            // Keep trimmed
          }

          const fullAddress = [primaryText, secondaryText].filter(Boolean).join(', ');

          fallbackItems.push({
            id: `native-${i}-${res.latitude}-${res.longitude}`,
            primaryText,
            secondaryText,
            fullAddress,
            latitude: res.latitude,
            longitude: res.longitude,
            shortName,
          });
        }

        set({ suggestions: fallbackItems, isLoadingSuggestions: false });
        return fallbackItems;
      }

      set({ suggestions: [], isLoadingSuggestions: false });
      return [];
    } catch {
      set({ suggestions: [], isLoadingSuggestions: false });
      return [];
    }
  },

  clearSuggestions: () => {
    set({ suggestions: [], isLoadingSuggestions: false });
  },

  selectLocation: async ({ name, formattedAddress, latitude, longitude, isAutoDetected = false }) => {
    const cleanName = sanitizeAddressString(name) || 'Victoria Island';
    const cleanFull = sanitizeAddressString(formattedAddress) || cleanName;

    const newLocation: UserLocation = {
      name: cleanName,
      formattedAddress: cleanFull,
      latitude,
      longitude,
      isAutoDetected,
      updatedAt: new Date().toISOString(),
    };

    set({
      currentLocation: newLocation,
      suggestions: [],
      errorMsg: null,
    });

    try {
      await SecureStore.setItemAsync(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    } catch {
      // Storage error ignored
    }
  },

  clearError: () => set({ errorMsg: null }),
}));
