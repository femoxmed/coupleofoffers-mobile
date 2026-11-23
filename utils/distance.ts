import type { Offer } from '../types';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getOfferDistanceBadge(
  offer: Offer,
  userLat?: number | null,
  userLon?: number | null
): string | undefined {
  if (typeof userLat !== 'number' || typeof userLon !== 'number') return undefined;

  let bestDist: number | null = null;
  if (typeof offer.latitude === 'number' && typeof offer.longitude === 'number') {
    bestDist = calculateDistanceKm(userLat, userLon, offer.latitude, offer.longitude);
  }

  if (Array.isArray(offer.branches)) {
    for (const b of offer.branches) {
      const bAny = b as any;
      if (typeof bAny.latitude === 'number' && typeof bAny.longitude === 'number') {
        const d = calculateDistanceKm(userLat, userLon, bAny.latitude, bAny.longitude);
        if (bestDist === null || d < bestDist) bestDist = d;
      }
    }
  }

  if (bestDist !== null) {
    return bestDist < 1 ? '< 1 km' : `${bestDist.toFixed(1)} km`;
  }

  return undefined;
}
