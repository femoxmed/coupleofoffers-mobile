export const Config = {
  API_BASE_URL: (process.env.EXPO_PUBLIC_API_URL || 'https://frays-operate-grill.ngrok-free.dev').replace(/\/+$/, ''),
  WEB_BASE_URL: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3003',
  CURRENCY_SYMBOL: '₦',
  FALLBACK_HERO_IMAGE: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80',
  FALLBACK_VENUE_IMAGE: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
  FALLBACK_OFFER_IMAGE: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
};

/**
 * Format kobo to Nigerian Naira (₦) display string
 * e.g. 12000000 kobo -> ₦120,000
 */
export function formatNaira(priceKobo: number | null | undefined): string {
  if (typeof priceKobo !== 'number' || isNaN(priceKobo)) return '₦0';
  const naira = Math.round(priceKobo / 100);
  return `${Config.CURRENCY_SYMBOL}${naira.toLocaleString('en-NG')}`;
}

/**
 * Normalizes image paths so they ALWAYS load without 404s.
 */
export function resolveImageUrl(url: string | null | undefined, fallback = Config.FALLBACK_OFFER_IMAGE): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  // 1. If it's already an absolute HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 2. If it's an API route served by the backend (e.g. /api/v1/offer-photos/...)
  if (url.startsWith('/api/v1/')) {
    return `${Config.API_BASE_URL}${url}`;
  }

  // 3. Return clean path (for local bundled asset matching)
  return url;
}
