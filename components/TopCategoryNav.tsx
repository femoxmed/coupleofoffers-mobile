import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Utensils,
  Heart,
  Gamepad2,
  Wine,
  Armchair,
  Film,
  Music,
  Palette as PaletteIcon,
  Trees,
  ChefHat,
  Sun,
  Layers,
  CircleDot,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { resolveImageSource } from '../constants/images';
import { Config } from '../constants/config';

export interface TopCategory {
  id: string;
  name: string;
  image: string;
  icon: any;
}

// Exactly matches web/app/storefront.tsx and web/app/offer-display.tsx
export const WEB_HOMEPAGE_CATEGORIES: TopCategory[] = [
  { id: 'all', name: 'All offers', image: '/images/terrace-evening.jpg', icon: Layers },
  { id: 'dining', name: 'Restaurants', image: '/images/suya.jpg', icon: Utensils },
  { id: 'spa', name: 'Spas', image: '/images/spa.jpg', icon: Heart },
  { id: 'gaming', name: 'Game houses', image: '/images/gaming.jpg', icon: Gamepad2 },
  { id: 'bar', name: 'Bars', image: '/images/terrace-evening.jpg', icon: Wine },
  { id: 'lounge', name: 'Lounges', image: '/images/dining-room.jpg', icon: Armchair },
  { id: 'cinema', name: 'Cinema', image: '/images/cinema.jpg', icon: Film },
  { id: 'music', name: 'Live music', image: '/images/music.jpg', icon: Music },
  { id: 'art', name: 'Art workshops', image: '/images/art.jpg', icon: PaletteIcon },
  { id: 'outdoors', name: 'Outdoor dates', image: '/images/outdoors.jpg', icon: Trees },
  { id: 'cooking', name: 'Cooking classes', image: '/images/account-chef.jpg', icon: ChefHat },
  { id: 'beach', name: 'Beach clubs', image: '/images/outdoors.jpg', icon: Sun },
  { id: 'bowling', name: 'Bowling', image: '/images/gaming.jpg', icon: CircleDot },
  { id: 'karaoke', name: 'Karaoke', image: '/images/music.jpg', icon: Mic },
  { id: 'other', name: 'Other experiences', image: '/images/terrace-evening.jpg', icon: Sparkles },
];

interface TopCategoryNavProps {
  selected?: string;
  onSelect: (category: TopCategory) => void;
  categories?: TopCategory[];
}

export function TopCategoryNav({ selected, onSelect, categories = WEB_HOMEPAGE_CATEGORIES }: TopCategoryNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isSelected = Boolean(selected && selected === cat.id);
        const Icon = cat.icon;

        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat)}
            activeOpacity={0.8}
            style={[styles.pill, isSelected && styles.activePill]}
          >
            {/* 32px circular thumbnail matching web className="size-8 rounded-full object-cover" */}
            <Image
              source={resolveImageSource(cat.image, Config.FALLBACK_OFFER_IMAGE)}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
            <Icon
              size={14}
              color={isSelected ? Palette.champagne : Palette.aubergine}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.pillText, isSelected && styles.activePillText]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activePill: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: Palette.muted,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.aubergine,
    letterSpacing: -0.2,
  },
  activePillText: {
    color: '#FFFCF7',
  },
});
