import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const LOCATION_STORAGE_KEY = 'coo_user_location';

export interface UserLocation {
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  isAutoDetected: boolean;
  updatedAt: string;
}

export const POPULAR_AREAS = [
  'Victoria Island',
  'Ikoyi',
  'Lekki Phase 1',
  'Ikeja GRA',
  'Maryland',
  'Surulere',
  'Gbagada',
  'Oniru',
];

interface LocationState {
  currentLocation: UserLocation;
  isDetecting: boolean;
  errorMsg: string | null;
  savedLocations: UserLocation[];

  // Actions
  initLocation: () => Promise<void>;
  detectCurrentLocation: () => Promise<{ success: boolean; location?: UserLocation; error?: string }>;
  setManualLocation: (areaName: string, coords?: { latitude: number; longitude: number }) => Promise<void>;
  geocodeAndSetLocation: (searchQuery: string) => Promise<{ success: boolean; location?: UserLocation; error?: string }>;
  clearError: () => void;
}

const DEFAULT_LOCATION: UserLocation = {
  name: 'Victoria Island',
  formattedAddress: 'Victoria Island',
  isAutoDetected: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Sanitizes address strings to strictly avoid prohibited words (e.g. Lagos)
 * and extract a clean neighborhood or district name.
 */
function sanitizeAreaName(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\bLagos\b/gi, '')
    .replace(/\bNigeria\b/gi, '')
    .replace(/[,\s-]+$/, '')
    .replace(/^[,\s-]+/, '')
    .trim();
}

/**
 * Extracts the most relevant neighborhood or area name from reverse geocoded address.
 */
function resolveNeighborhood(addr: Location.LocationGeocodedAddress): string {
  // Check known popular areas first
  const candidates = [
    addr.district,
    addr.subregion,
    addr.name,
    addr.street,
    addr.city,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const clean = sanitizeAreaName(candidate);
    for (const popular of POPULAR_AREAS) {
      if (clean.toLowerCase().includes(popular.toLowerCase())) {
        return popular;
      }
    }
  }

  // If no exact popular match, pick the best non-empty candidate (district > subregion > street > name)
  const best =
    sanitizeAreaName(addr.district) ||
    sanitizeAreaName(addr.subregion) ||
    sanitizeAreaName(addr.street) ||
    sanitizeAreaName(addr.name) ||
    'Victoria Island';

  return best.replace(/\s+/g, ' ').trim();
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: DEFAULT_LOCATION,
  isDetecting: false,
  errorMsg: null,
  savedLocations: [],

  initLocation: async () => {
    try {
      const raw = await SecureStore.getItemAsync(LOCATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserLocation;
        if (parsed?.name) {
          set({ currentLocation: parsed });
        }
      }
    } catch {
      // Fallback to default
    }
  },

  detectCurrentLocation: async () => {
    set({ isDetecting: true, errorMsg: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const error = 'Location permission was denied. Please select your area manually.';
        set({ isDetecting: false, errorMsg: error });
        return { success: false, error };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      let detectedName = 'Victoria Island';
      let fullAddr = '';

      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseResults && reverseResults.length > 0) {
          const addr = reverseResults[0];
          detectedName = resolveNeighborhood(addr);

          const parts = [
            sanitizeAreaName(addr.street),
            detectedName,
          ].filter(Boolean);
          fullAddr = parts.join(', ');
        }
      } catch {
        // Reverse geocoding fallback
        detectedName = 'Victoria Island';
      }

      const newLocation: UserLocation = {
        name: detectedName,
        formattedAddress: fullAddr || detectedName,
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

  setManualLocation: async (areaName: string, coords?: { latitude: number; longitude: number }) => {
    const cleanName = sanitizeAreaName(areaName) || areaName;
    const newLocation: UserLocation = {
      name: cleanName,
      formattedAddress: cleanName,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      isAutoDetected: false,
      updatedAt: new Date().toISOString(),
    };

    set({ currentLocation: newLocation, errorMsg: null });

    try {
      await SecureStore.setItemAsync(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    } catch {
      // Storage error ignored
    }
  },

  geocodeAndSetLocation: async (searchQuery: string) => {
    const cleanQuery = sanitizeAreaName(searchQuery);
    if (!cleanQuery) {
      return { success: false, error: 'Please enter a valid area or address.' };
    }

    set({ isDetecting: true, errorMsg: null });
    try {
      const results = await Location.geocodeAsync(cleanQuery);
      if (!results || results.length === 0) {
        const error = `No matches found for "${cleanQuery}". Try another area.`;
        set({ isDetecting: false, errorMsg: error });
        return { success: false, error };
      }

      const { latitude, longitude } = results[0];
      let resolvedName = cleanQuery;
      let fullAddr = cleanQuery;

      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev && rev.length > 0) {
          resolvedName = resolveNeighborhood(rev[0]);
          fullAddr = [sanitizeAreaName(rev[0].street), resolvedName].filter(Boolean).join(', ');
        }
      } catch {
        // Keep cleanQuery
      }

      const newLocation: UserLocation = {
        name: resolvedName,
        formattedAddress: fullAddr || resolvedName,
        latitude,
        longitude,
        isAutoDetected: false,
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
      const error = err?.message || 'Geocoding failed. Please select from the list.';
      set({ isDetecting: false, errorMsg: error });
      return { success: false, error };
    }
  },

  clearError: () => set({ errorMsg: null }),
}));
