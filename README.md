# Couple Of Offers — React Native Mobile App

Luxury mobile application for **Couple Of Offers**, built with **Expo (SDK 58)**, **Expo Router**, **TypeScript**, **TanStack Query**, and **Paystack**.

---

## Live API Configuration

- **API Base URL:** `https://frays-operate-grill.ngrok-free.dev`
- **Prefix:** `/api/v1`
- **Live Connected Endpoints:**
  - `GET /api/v1/homepage-slides` (Dynamic hero editorial carousel)
  - `GET /api/v1/offers` (Published packages & featured offers)
  - `GET /api/v1/partners` (Public venue directory & starting prices)
  - `GET /api/v1/partners/:slug` (Individual venue profile & available packages)
  - `GET /api/v1/offers/:id` (Offer details, inclusions, & live slot capacity)
  - `POST /api/v1/holds` (5-minute slot hold reservation)
  - `POST /api/v1/payments/initialize` (Paystack authorization URL)

---

## App Visual System & Brand Assets

- **Signature Emblem:** Native SVG `BrandEmblem` rendering the linked-Os couple rings (`#965276` Mulberry + `#E4BB81` Champagne).
- **Brand Palette:**
  - `Palette.aubergine` (`#301D32`) — Primary text & contrast
  - `Palette.porcelain` (`#FAF5ED`) — Luxury canvas background
  - `Palette.mulberry` (`#743D60`) — Primary CTA and active accents
  - `Palette.champagne` (`#E5C99A`) — VIP ribbons, category pills & accents
  - `Palette.goldInk` (`#806020`) — Price highlights & guarantee badges
  - `Palette.card` (`#FFFCF7`) — Elevated warm card surfaces

---

## App Screens & Navigation

```text
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Ultra-modern navigation bar (Explore, Venues, Saved, Bookings, Profile)
│   │   ├── index.tsx        # Home / Explore: Masthead, Hero Carousel, Featured Partners, Categories, Featured Offers
│   │   ├── partners.tsx     # Dedicated Partners Directory with search & area filters
│   │   ├── saved.tsx        # Saved date experiences (Wishlist) with count badge
│   │   ├── bookings.tsx     # Reservations & voucher receipts
│   │   └── profile.tsx      # Booker account, dietary notes & concierge
│   ├── partner/
│   │   └── [slug].tsx       # Venue profile, bio, starting price & all venue packages
│   ├── offer/
│   │   └── [id].tsx         # Experience detail: Inclusions, venue notes, slot picker, 5-min hold CTA
│   ├── checkout/
│   │   └── [holdId].tsx     # Paystack WebView & checkout modal
│   └── _layout.tsx          # Root Stack & React Query Provider
├── components/
│   ├── BrandEmblem.tsx      # Native SVG linked rings emblem
│   ├── BrandLogo.tsx        # Masthead logo with typography
│   ├── HeroCarousel.tsx     # Editorial swipeable slides with dark scrim
│   ├── PartnerCard.tsx      # Curated venue card with starting price & package count
│   ├── OfferCard.tsx        # Experience card with inclusions & save heart
│   └── CategoryChips.tsx    # Romantic Dinner, Rooftops, Activities filter pills
```

---

## Running the App

```bash
cd mobile
npm run start
```

- Press **`i`** to open in the iOS Simulator.
- Press **`a`** to open in the Android Emulator.
- Scan the QR code using **Expo Go** on a physical phone.
