import { Config } from './config';

/**
 * Local assets copied directly from web/public/images/
 * Guarantees 1:1 image parity with the web app and instant rendering without network round-trips.
 */
export const LOCAL_ASSETS: Record<string, any> = {
  'terrace-evening.jpg': require('../assets/images/terrace-evening.jpg'),
  'curated-experiences-couples.webp': require('../assets/images/curated-experiences-couples.webp'),
  'curated-experiences.webp': require('../assets/images/curated-experiences.webp'),
  'group-friends-dining.jpg': require('../assets/images/group-friends-dining.jpg'),
  'dining-room.jpg': require('../assets/images/dining-room.jpg'),
  'suya.jpg': require('../assets/images/suya.jpg'),
  'spa.jpg': require('../assets/images/spa.jpg'),
  'spa-treatment.jpg': require('../assets/images/spa-treatment.jpg'),
  'spa-massage.jpg': require('../assets/images/spa-massage.jpg'),
  'gaming.jpg': require('../assets/images/gaming.jpg'),
  'gaming-station.jpg': require('../assets/images/gaming-station.jpg'),
  'arcade-games.jpg': require('../assets/images/arcade-games.jpg'),
  'cinema.jpg': require('../assets/images/cinema.jpg'),
  'music.jpg': require('../assets/images/music.jpg'),
  'art.jpg': require('../assets/images/art.jpg'),
  'outdoors.jpg': require('../assets/images/outdoors.jpg'),
  'partner-banner.jpg': require('../assets/images/partner-banner.jpg'),
  'partner-hero.jpg': require('../assets/images/partner-hero.jpg'),
  'partner-cta-bg.jpg': require('../assets/images/partner-cta-bg.jpg'),
  'about-courtyard-lunch.webp': require('../assets/images/about-courtyard-lunch.webp'),
  'about-pottery-studio.webp': require('../assets/images/about-pottery-studio.webp'),
  'account-chef.jpg': require('../assets/images/account-chef.jpg'),
  'account-date.jpg': require('../assets/images/account-date.jpg'),
  'account-table.jpg': require('../assets/images/account-table.jpg'),
};

/**
 * Resolves an image path to either a local require() asset or a remote URI object.
 * Perfectly compatible with `expo-image` <Image source={...} />.
 */
export function resolveImageSource(
  url: any,
  fallbackUri: any = LOCAL_ASSETS['terrace-evening.jpg'] || Config.FALLBACK_OFFER_IMAGE
): any {
  const getFallback = () => {
    if (typeof fallbackUri === 'number' || (typeof fallbackUri === 'object' && fallbackUri?.default)) {
      return fallbackUri;
    }
    if (typeof fallbackUri === 'string' && fallbackUri.trim() !== '') {
      const fbClean = fallbackUri.split('?')[0].trim();
      const fbFilename = fbClean.substring(fbClean.lastIndexOf('/') + 1).trim();
      if (LOCAL_ASSETS[fbFilename]) return LOCAL_ASSETS[fbFilename];
      if (fallbackUri.startsWith('http://') || fallbackUri.startsWith('https://')) {
        return { uri: fallbackUri };
      }
    }
    return LOCAL_ASSETS['terrace-evening.jpg'] || { uri: Config.FALLBACK_OFFER_IMAGE };
  };

  if (!url) {
    return getFallback();
  }

  // 1. If already a required number or module
  if (typeof url === 'number' || (typeof url === 'object' && url.default)) {
    return url;
  }

  if (typeof url !== 'string' || url.trim() === '') {
    return getFallback();
  }

  // 2. Extract clean filename (e.g. "/images/suya.jpg" -> "suya.jpg")
  const cleanUrl = url.split('?')[0].trim();
  const filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1).trim();

  // 3. Prioritize exact local bundled web asset
  if (LOCAL_ASSETS[filename]) {
    return LOCAL_ASSETS[filename];
  }
  if (!filename.includes('.') && LOCAL_ASSETS[`${filename}.jpg`]) {
    return LOCAL_ASSETS[`${filename}.jpg`];
  }
  if (!filename.includes('.') && LOCAL_ASSETS[`${filename}.webp`]) {
    return LOCAL_ASSETS[`${filename}.webp`];
  }

  // 4. If absolute remote URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { uri: url };
  }

  // 5. If dynamic API photo route
  if (url.startsWith('/api/v1/')) {
    return { uri: `${Config.API_BASE_URL}${url}` };
  }

  // 6. Reliable fallback
  return getFallback();
}
