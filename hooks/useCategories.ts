import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
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
  CircleDot,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { catalogService, type CatalogCategory } from '../services/catalog';

export interface CategoryOption {
  id: string;
  name: string;
  label: string;
  image: string;
  icon: any;
}

export const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: 'all', name: 'All offers', label: 'All Dates', image: '/images/terrace-evening.jpg', icon: Layers },
  { id: 'dining', name: 'Restaurants', label: 'Restaurants', image: '/images/suya.jpg', icon: Utensils },
  { id: 'spa', name: 'Spas', label: 'Spas', image: '/images/spa.jpg', icon: Heart },
  { id: 'gaming', name: 'Game houses', label: 'Game Houses', image: '/images/gaming.jpg', icon: Gamepad2 },
  { id: 'bar', name: 'Bars', label: 'Bars', image: '/images/terrace-evening.jpg', icon: Wine },
  { id: 'lounge', name: 'Lounges', label: 'Lounges', image: '/images/dining-room.jpg', icon: Armchair },
  { id: 'cinema', name: 'Cinema', label: 'Cinema', image: '/images/cinema.jpg', icon: Film },
  { id: 'music', name: 'Live music', label: 'Live Music', image: '/images/music.jpg', icon: Music },
  { id: 'art', name: 'Art workshops', label: 'Art Workshops', image: '/images/art.jpg', icon: PaletteIcon },
  { id: 'outdoors', name: 'Outdoor dates', label: 'Outdoors', image: '/images/outdoors.jpg', icon: Trees },
  { id: 'cooking', name: 'Cooking classes', label: 'Cooking Classes', image: '/images/account-chef.jpg', icon: ChefHat },
  { id: 'beach', name: 'Beach clubs', label: 'Beach Clubs', image: '/images/outdoors.jpg', icon: Sun },
  { id: 'bowling', name: 'Bowling', label: 'Bowling', image: '/images/gaming.jpg', icon: CircleDot },
  { id: 'karaoke', name: 'Karaoke', label: 'Karaoke', image: '/images/music.jpg', icon: Mic },
  { id: 'other', name: 'Other experiences', label: 'Other Experiences', image: '/images/terrace-evening.jpg', icon: Sparkles },
];

export function useCategories() {
  const { data: apiCategories, isLoading } = useQuery<CatalogCategory[]>({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const categories = useMemo<CategoryOption[]>(() => {
    if (!apiCategories || !Array.isArray(apiCategories) || apiCategories.length === 0) {
      return FALLBACK_CATEGORIES;
    }

    const allOption = FALLBACK_CATEGORIES[0];
    const serverOptions = apiCategories
      .filter((cat) => cat.active !== false)
      .map((cat) => {
        const fallback = FALLBACK_CATEGORIES.find(
          (f) => f.id.toLowerCase() === cat.slug.toLowerCase()
        );
        return {
          id: cat.slug,
          name: cat.name,
          label: cat.name,
          image: fallback?.image || '/images/terrace-evening.jpg',
          icon: fallback?.icon || Sparkles,
        };
      });

    return [allOption, ...serverOptions];
  }, [apiCategories]);

  return {
    categories,
    isLoading,
  };
}
