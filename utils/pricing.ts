import type { Offer } from '../types';
export function priceForParty(offer: Pick<Offer, 'price_kobo' | 'party_size' | 'extra_friend_price_kobo' | 'regular_price_kobo' | 'regular_extra_guest_kobo'>, partySize: number) {
  const extraGuests = Math.max(0, partySize - offer.party_size);
  const extraPrice = offer.extra_friend_price_kobo ?? 0;
  const totalKobo = offer.price_kobo + extraGuests * extraPrice;
  const regularTotalKobo = (offer.regular_price_kobo ?? offer.price_kobo) + extraGuests * (offer.regular_extra_guest_kobo ?? extraPrice);
  const savingsKobo = Math.max(0, regularTotalKobo - totalKobo);
  return { extraGuests, extraPrice, totalKobo, regularTotalKobo, savingsKobo, discountPercent: regularTotalKobo > 0 ? Math.round(savingsKobo / regularTotalKobo * 100) : 0 };
}
