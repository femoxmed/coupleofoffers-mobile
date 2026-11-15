import { apiClient } from './apiClient';
import { resolveImageUrl, Config } from '../constants/config';
import type {
  Offer,
  Partner,
  HomepageSlide,
  SavedOffer,
  Slot,
  HoldResponse,
  PaymentInitResponse,
} from '../types';

export const DEMO_PARTNERS: Partner[] = [
  {
    id: 'partner-1',
    name: 'Pepper & Coal',
    slug: 'pepper-coal',
    area: 'Gbagada',
    address: 'Commercial Avenue, Gbagada Phase 2',
    description: 'Artisan wood-fired dining and intimate cocktail lounge.',
    categories: ['dining', 'cocktails'],
    primary_category: 'dining',
    starting_price_kobo: 3200000,
    package_count: 2,
    banner_url: '/images/partner-banner.jpg',
  },
  {
    id: 'partner-2',
    name: 'RSVP Restaurant',
    slug: 'rsvp-restaurant',
    area: 'Victoria Island',
    address: '9 Eletu Ogabi St, Victoria Island',
    description: 'Modern European dining with secret courtyard pool and craft cocktail bar.',
    categories: ['dining', 'fine-dining'],
    primary_category: 'fine-dining',
    starting_price_kobo: 12000000,
    package_count: 3,
    banner_url: '/images/dining-room.jpg',
  },
  {
    id: 'partner-3',
    name: 'Shiro',
    slug: 'shiro-restaurant',
    area: 'Victoria Island',
    address: 'Block 2, Water Corporation Rd, Landmark Centre',
    description: 'Pan-Asian luxury dining featuring ocean views and soaring statues.',
    categories: ['dining', 'pan-asian'],
    primary_category: 'pan-asian',
    starting_price_kobo: 14000000,
    package_count: 2,
    banner_url: '/images/terrace-evening.jpg',
  },
  {
    id: 'partner-4',
    name: 'The View Rooftop',
    slug: 'the-view-rooftop',
    area: 'Lekki Phase 1',
    address: 'Admiralty Way, Lekki Phase 1',
    description: 'Breathtaking lagoon views with artisan platters and sunset prosecco.',
    categories: ['rooftop', 'sunset'],
    primary_category: 'rooftop',
    starting_price_kobo: 8500000,
    package_count: 2,
    banner_url: '/images/partner-hero.jpg',
  },
];

export const DEMO_OFFERS: Offer[] = [
  {
    id: '78974a3a-f7ab-4b43-ae23-6b446df553d5',
    title: 'Suya night in Lekki',
    slug: 'suya-night-in-lekki',
    category: 'dining',
    venue: 'Ember Table',
    venue_name: 'Ember Table',
    venue_id: 'partner-1',
    partner: 'Ember Table',
    street_address: 'Admiralty Way, Lekki Phase 1',
    inclusions: 'A reserved table, suya fresh off the grill and a chilled Chapman for each guest.',
    price_kobo: 2500000,
    regular_price_kobo: 3200000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 1200000,
    regular_extra_guest_kobo: 1400000,
    homepage_featured: true,
    booking_path: '/offers/suya-night-in-lekki',
    image_url: '/images/suya.jpg',
    gallery: [
      '/images/suya.jpg',
      '/images/dining-room.jpg',
      '/images/terrace-evening.jpg',
    ],
    days_available: 'Tuesday – Sunday',
    time_window: '6:00 PM – 11:00 PM',
  },
  {
    id: 'd439eb0c-0b88-4e66-b5ac-022ce1e1f399',
    title: 'A slow afternoon at the spa',
    slug: 'a-slow-afternoon-at-the-spa',
    category: 'spa',
    venue: 'Ikoyi',
    venue_name: 'Tirasa Wellness Spa',
    venue_id: 'partner-2',
    partner: 'Tirasa Wellness Spa',
    street_address: 'Glover Road, Ikoyi',
    inclusions: 'A 60-minute side-by-side massage for two, followed by hibiscus tea & fruit platter.',
    price_kobo: 4800000,
    regular_price_kobo: 6000000,
    party_size: 2,
    max_party_size: 2,
    extra_friend_price_kobo: 0,
    regular_extra_guest_kobo: 0,
    homepage_featured: true,
    booking_path: '/offers/a-slow-afternoon-at-the-spa',
    image_url: '/images/spa.jpg',
    gallery: [
      '/images/spa.jpg',
      '/images/spa-treatment.jpg',
      '/images/spa-massage.jpg',
    ],
    days_available: 'Wednesday – Sunday',
    time_window: '11:00 AM – 7:00 PM',
  },
  {
    id: '9c06fb18-3382-48b2-a4e2-f7a3644d5ed3',
    title: 'Arcade night for two',
    slug: 'arcade-night-for-two',
    category: 'gaming',
    venue: 'Ikeja',
    venue_name: 'VR & Arcade Hub',
    venue_id: 'partner-3',
    partner: 'VR & Arcade Hub',
    street_address: 'Isaac John Street, GRA, Ikeja',
    inclusions: 'Two hours of unlimited arcade games, a shared gaming station and a soft drink each.',
    price_kobo: 1800000,
    regular_price_kobo: 2400000,
    party_size: 2,
    max_party_size: 4,
    extra_friend_price_kobo: 900000,
    regular_extra_guest_kobo: 1200000,
    homepage_featured: false,
    booking_path: '/offers/arcade-night-for-two',
    image_url: '/images/gaming.jpg',
    gallery: [
      '/images/gaming.jpg',
      '/images/arcade-games.jpg',
      '/images/gaming-station.jpg',
    ],
    days_available: 'All Week',
    time_window: '2:00 PM – 10:00 PM',
  },
  {
    id: '829b3c85-41d2-47a8-a664-0c82a9cf63d7',
    title: 'The long lunch',
    slug: 'the-long-lunch',
    category: 'dining',
    venue: 'Lekki',
    venue_name: 'The Palm Courtyard',
    venue_id: 'partner-1',
    partner: 'The Palm Courtyard',
    street_address: 'Admiralty Way, Lekki Phase 1',
    inclusions: 'A two-course artisan lunch for two with a fresh Chapman and petit fours.',
    price_kobo: 3600000,
    regular_price_kobo: 4400000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 1500000,
    regular_extra_guest_kobo: 1800000,
    homepage_featured: true,
    booking_path: '/offers/the-long-lunch',
    image_url: '/images/dining-room.jpg',
    gallery: [
      '/images/dining-room.jpg',
      '/images/account-chef.jpg',
      '/images/account-table.jpg',
    ],
    days_available: 'Thursday – Sunday',
    time_window: '12:00 PM – 4:00 PM',
  },
  {
    id: '203e7fa5-8e28-4974-85f2-5dab3b622801',
    title: 'Supper on the terrace',
    slug: 'supper-on-the-terrace',
    category: 'dining',
    venue: 'Victoria Island',
    venue_name: 'The Citrus Terrace',
    venue_id: 'partner-2',
    partner: 'The Citrus Terrace',
    street_address: 'Adeola Odeku Street, Victoria Island',
    inclusions: 'A shared starter, two chef-special mains and a pair of citrus coolers on the outdoor terrace.',
    price_kobo: 4200000,
    regular_price_kobo: 5200000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 1800000,
    regular_extra_guest_kobo: 2200000,
    homepage_featured: false,
    booking_path: '/offers/supper-on-the-terrace',
    image_url: '/images/terrace-evening.jpg',
    gallery: [
      '/images/terrace-evening.jpg',
      '/images/account-table.jpg',
      '/images/dining-room.jpg',
    ],
    days_available: 'Tuesday – Sunday',
    time_window: '7:00 PM – 11:00 PM',
  },
  {
    id: 'd839376c-a5d9-40a5-b650-3b4854135b22',
    title: 'The charcoal grill platter',
    slug: 'the-charcoal-grill-platter',
    category: 'dining',
    venue: 'Gbagada',
    venue_name: 'Pepper & Coal',
    venue_id: 'partner-1',
    partner: 'Pepper & Coal',
    street_address: 'Commercial Avenue, Gbagada Phase 2',
    inclusions: 'A shared platter of artisan chicken suya, roasted spiced corn and two fresh ginger coolers.',
    price_kobo: 3200000,
    regular_price_kobo: 4000000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 1400000,
    regular_extra_guest_kobo: 1700000,
    homepage_featured: false,
    booking_path: '/offers/the-charcoal-grill-platter',
    image_url: '/images/suya.jpg',
    gallery: [
      '/images/suya.jpg',
      '/images/account-chef.jpg',
      '/images/dining-room.jpg',
    ],
    days_available: 'Wednesday – Sunday',
    time_window: '5:00 PM – 11:00 PM',
  },
  {
    id: 'ed0e99c7-2632-4c22-ab7d-eee0119b83df',
    title: 'The lantern supper',
    slug: 'the-lantern-supper',
    category: 'dining',
    venue: 'Oniru',
    venue_name: 'Lagoon Lantern',
    venue_id: 'partner-3',
    partner: 'Lagoon Lantern',
    street_address: 'Palace Way, Oniru',
    inclusions: 'Whole grilled croaker for two, seasoned yam wedges and a pair of sparkling lime spritzers by lantern light.',
    price_kobo: 4500000,
    regular_price_kobo: 5600000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 1800000,
    regular_extra_guest_kobo: 2200000,
    homepage_featured: false,
    booking_path: '/offers/the-lantern-supper',
    image_url: '/images/terrace-evening.jpg',
    gallery: [
      '/images/terrace-evening.jpg',
      '/images/dining-room.jpg',
      '/images/account-date.jpg',
    ],
    days_available: 'Friday – Sunday',
    time_window: '6:30 PM – 11:30 PM',
  },
  {
    id: 'offer-8',
    title: 'A saffron tasting for two',
    slug: 'a-saffron-tasting-for-two',
    category: 'dining',
    venue: 'Maryland',
    venue_name: 'Saffron Room',
    venue_id: 'partner-4',
    partner: 'Saffron Room',
    street_address: 'Mobolaji Bank Anthony Way, Maryland',
    inclusions: 'Coconut jumbo prawns, signature saffron rice and a shared artisanal dark chocolate dessert.',
    price_kobo: 4600000,
    regular_price_kobo: 5800000,
    party_size: 2,
    max_party_size: 6,
    extra_friend_price_kobo: 2000000,
    regular_extra_guest_kobo: 2500000,
    homepage_featured: false,
    booking_path: '/offers/a-saffron-tasting-for-two',
    image_url: '/images/dining-room.jpg',
    gallery: [
      '/images/dining-room.jpg',
      '/images/account-table.jpg',
      '/images/account-chef.jpg',
    ],
    days_available: 'Tuesday – Saturday',
    time_window: '6:00 PM – 10:30 PM',
  },
];

export const WEB_HOMEPAGE_SLIDES: HomepageSlide[] = [
  {
    id: 'welcome',
    label: 'Exclusive date experiences',
    headline: 'Know your spend',
    accent: 'before you go.',
    copy: "Pick your dates, see what's included and pay one discounted package price upfront.",
    href: '/(tabs)/explore',
    action: 'Find a date',
    image: '/images/terrace-evening.jpg',
  },
  {
    id: 'curated-experiences',
    label: 'Curated experiences',
    headline: 'A couple of ways',
    accent: 'to spend the day.',
    copy: 'Dinner, a spa afternoon, game night or something creative. Find an experience made for your kind of date.',
    href: '/(tabs)/explore',
    action: 'Explore experiences',
    image: '/images/curated-experiences-couples.webp',
  },
  {
    id: 'friends',
    label: 'Time together',
    headline: 'Make time',
    accent: 'for your people.',
    copy: 'Catch up over good food, share a laugh and find something everyone will enjoy.',
    href: '/(tabs)/explore',
    action: 'Explore group offers',
    image: '/images/group-friends-dining.jpg',
  },
];

export const catalogService = {
  /**
   * Fetch all published offers
   */
  async getOffers(): Promise<Offer[]> {
    try {
      const data = await apiClient<Offer[]>('/api/v1/offers');
      if (Array.isArray(data) && data.length > 0) {
        return data.map((offer) => ({
          ...offer,
          image_url: resolveImageUrl(offer.image_url, Config.FALLBACK_OFFER_IMAGE),
        }));
      }
      return DEMO_OFFERS;
    } catch (err) {
      console.warn('Failed to fetch live offers from API, using curated catalog:', err);
      return DEMO_OFFERS;
    }
  },

  /**
   * Fetch single offer with slots
   */
  async getOfferById(id: string): Promise<Offer & { slots?: Slot[] }> {
    try {
      const data = await apiClient<Offer & { slots?: Slot[] }>(`/api/v1/offers/${id}`);
      return {
        ...data,
        image_url: resolveImageUrl(data.image_url, Config.FALLBACK_OFFER_IMAGE),
      };
    } catch {
      const demo =
        DEMO_OFFERS.find((o) => o.id === id || o.slug === id) || DEMO_OFFERS[0];
      return {
        ...demo,
        slots: [
          {
            id: 'slot-1',
            offer_id: demo.id,
            starts_at: '2026-11-20T19:00:00Z',
            cutoff_at: '2026-11-20T16:00:00Z',
            remaining_units: 4,
            capacity_units: 8,
          },
          {
            id: 'slot-2',
            offer_id: demo.id,
            starts_at: '2026-11-21T18:00:00Z',
            cutoff_at: '2026-11-21T15:00:00Z',
            remaining_units: 3,
            capacity_units: 8,
          },
          {
            id: 'slot-3',
            offer_id: demo.id,
            starts_at: '2026-11-22T20:00:00Z',
            cutoff_at: '2026-11-22T17:00:00Z',
            remaining_units: 5,
            capacity_units: 8,
          },
        ],
      };
    }
  },

  /**
   * Fetch all partner venues
   */
  async getPartners(): Promise<Partner[]> {
    try {
      const data = await apiClient<Partner[]>('/api/v1/partners');
      if (Array.isArray(data) && data.length > 0) {
        return data.map((p) => ({
          ...p,
          banner_url: resolveImageUrl(p.banner_url, Config.FALLBACK_VENUE_IMAGE),
        }));
      }
      return DEMO_PARTNERS;
    } catch {
      return DEMO_PARTNERS;
    }
  },

  /**
   * Fetch single partner profile by slug or ID
   */
  async getPartnerBySlug(slug: string): Promise<Partner & { packages?: Offer[] }> {
    try {
      const data = await apiClient<any>(`/api/v1/partners/${slug}`);
      return {
        ...data,
        banner_url: resolveImageUrl(data.banner_url, Config.FALLBACK_VENUE_IMAGE),
        packages: Array.isArray(data.packages)
          ? data.packages.map((pkg: Offer) => ({
              ...pkg,
              image_url: resolveImageUrl(pkg.image_url, Config.FALLBACK_OFFER_IMAGE),
            }))
          : [],
      };
    } catch {
      const demo =
        DEMO_PARTNERS.find((p) => p.slug === slug || p.id === slug) ||
        DEMO_PARTNERS[0];
      const partnerOffers = DEMO_OFFERS.filter(
        (o) =>
          o.venue_id === demo.id ||
          o.partner === demo.name ||
          o.venue_name === demo.name ||
          (demo.slug && o.slug?.includes(demo.slug))
      );
      return {
        ...demo,
        packages: partnerOffers.length > 0 ? partnerOffers : [DEMO_OFFERS[0]],
      };
    }
  },

  /**
   * Fetch homepage hero slides (exact 1:1 match with web/app/page.tsx)
   */
  async getHomepageSlides(): Promise<HomepageSlide[]> {
    const webStandardSlides: HomepageSlide[] = [
      {
        id: 'welcome',
        label: 'Exclusive date experiences',
        headline: 'Know your spend',
        accent: 'before you go.',
        copy: "Pick your dates, see what's included and pay one discounted package price upfront.",
        href: '/(tabs)/explore',
        action: 'Find a date',
        image: '/images/terrace-evening.jpg',
      },
      {
        id: 'curated-experiences',
        label: 'Curated experiences',
        headline: 'A couple of ways',
        accent: 'to spend the day.',
        copy: 'Dinner, a spa afternoon, game night or something creative. Find an experience made for your kind of date.',
        href: '/(tabs)/explore',
        action: 'Explore experiences',
        image: '/images/curated-experiences-couples.webp',
      },
      {
        id: 'friends',
        label: 'Time together',
        headline: 'Make time',
        accent: 'for your people.',
        copy: 'Catch up over good food, share a laugh and find something everyone will enjoy.',
        href: '/(tabs)/explore',
        action: 'Explore group offers',
        image: '/images/group-friends-dining.jpg',
      },
    ];

    try {
      const data = await apiClient<HomepageSlide[]>('/api/v1/homepage-slides');
      if (Array.isArray(data) && data.length > 0) {
        const liveWelcome = data.find((s) => s.id === 'welcome') || data[0];
        return [
          {
            ...webStandardSlides[0],
            headline: liveWelcome.headline || webStandardSlides[0].headline,
            accent: liveWelcome.accent || webStandardSlides[0].accent,
            copy: liveWelcome.copy?.replace(/in Nigeria|in Lagos/gi, '') || webStandardSlides[0].copy,
            image: '/images/terrace-evening.jpg',
          },
          webStandardSlides[1],
          webStandardSlides[2],
        ];
      }
      return webStandardSlides;
    } catch {
      return webStandardSlides;
    }
  },

  /**
   * Fetch saved offers
   */
  async getSavedOffers(): Promise<SavedOffer[]> {
    try {
      const data = await apiClient<SavedOffer[]>('/api/v1/account/saved');
      return data.map((o) => ({
        ...o,
        image_url: resolveImageUrl(o.image_url, Config.FALLBACK_OFFER_IMAGE),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Toggle save offer
   */
  async toggleSaveOffer(id: string, save: boolean): Promise<void> {
    // Map legacy demo IDs if present
    const demoMap: Record<string, string> = {
      'offer-1': '78974a3a-f7ab-4b43-ae23-6b446df553d5',
      'offer-2': 'd439eb0c-0b88-4e66-b5ac-022ce1e1f399',
      'offer-3': '9c06fb18-3382-48b2-a4e2-f7a3644d5ed3',
      'offer-4': '829b3c85-41d2-47a8-a664-0c82a9cf63d7',
      'offer-5': '203e7fa5-8e28-4974-85f2-5dab3b622801',
      'offer-6': 'd839376c-a5d9-40a5-b650-3b4854135b22',
      'offer-7': 'ed0e99c7-2632-4c22-ab7d-eee0119b83df',
    };
    const targetId = demoMap[id] || id;

    try {
      await apiClient(`/api/v1/account/saved/${targetId}`, {
        method: save ? 'PUT' : 'DELETE',
      });
    } catch (err: any) {
      // If unauthenticated or backend unavailable, let caller know but don't crash
      if (err?.message?.includes('Unauthorized') || err?.message?.includes('Not Found')) {
        // Expected when user is browsing as a guest without an account token
        return;
      }
      throw err;
    }
  },

  /**
   * Create hold on slot
   */
  async createHold(slotId: string, guestId: string): Promise<HoldResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return apiClient<HoldResponse>('/api/v1/holds', {
      method: 'POST',
      body: JSON.stringify({ requestId, slotId, guestId }),
    });
  },

  /**
   * Initialize Paystack payment
   */
  async initializePayment(holdId: string, guestId: string, email: string): Promise<PaymentInitResponse> {
    return apiClient<PaymentInitResponse>('/api/v1/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ holdId, guestId, email }),
    });
  },
};
