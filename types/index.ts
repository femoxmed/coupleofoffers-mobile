export type OfferBranch = {
  id: string;
  name: string;
  address: string | null;
  offer_id: string;
  slug: string;
  opening_hours?: { day: string; open: boolean; start?: string; end?: string }[] | null;
};

export type Offer = {
  id: string;
  title: string;
  slug?: string;
  category: string;
  venue: string;
  partner?: string;
  inclusions: string;
  short_description?: string | null;
  regular_price_kobo: number | null;
  regular_extra_guest_kobo?: number | null;
  price_kobo: number;
  party_size: number;
  max_party_size: number;
  extra_friend_price_kobo?: number;
  booking_path?: string;
  image_url: string | null;
  venue_id?: string;
  venue_name: string;
  venue_slug?: string;
  venue_banner_url?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  arrival_notes?: string | null;
  days_available?: string | null;
  time_window?: string | null;
  expires_at?: string | null;
  homepage_featured?: boolean;
  featured_at?: string | null;
  branches?: OfferBranch[] | null;
  gallery?: string[];
};

export type Partner = {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string | null;
  description: string;
  categories: string[];
  primary_category: string;
  starting_price_kobo: number | null;
  package_count: number;
  banner_url?: string | null;
  logo_url?: string | null;
  featured_at?: string | null;
  opening_hours?: { day: string; open: boolean; start?: string; end?: string }[] | null;
  branches?: { id: string; name: string; address: string | null; opening_hours?: { day: string; open: boolean; start?: string; end?: string }[] | null }[];
};

export type Slot = {
  id: string;
  offer_id: string;
  starts_at: string;
  cutoff_at: string;
  remaining_units: number;
  capacity_units: number;
};

export type HomepageSlide = {
  id: string;
  label: string;
  headline: string;
  accent: string;
  copy: string;
  href: string;
  action: string;
  image: string;
};

export type SavedOffer = {
  id: string;
  title: string;
  slug?: string;
  venue_name: string;
  price_kobo: number;
  party_size: number;
  image_url: string | null;
};

export type HoldResponse = {
  hold_id: string;
  slot_id: string;
  expires_at: string;
  remaining_seconds: number;
};

export type PaymentInitResponse = {
  authorization_url: string;
  reference: string;
};
