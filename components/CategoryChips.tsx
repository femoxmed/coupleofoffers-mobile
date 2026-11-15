import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import {
  UtensilsCrossed,
  Sun,
  Activity,
  Compass,
  Heart,
  Coffee,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';

export interface CategoryItem {
  id: string;
  name: string;
  icon: any;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'All Dates', icon: Compass },
  { id: 'dining', name: 'Romantic Dinner', icon: UtensilsCrossed },
  { id: 'rooftop', name: 'Sunset & Rooftops', icon: Sun },
  { id: 'activities', name: 'Couples Activities', icon: Activity },
  { id: 'spa', name: 'Spa & Retreats', icon: Heart },
  { id: 'lounges', name: 'Bespoke Cocktails', icon: Coffee },
];

interface CategoryChipsProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selected === category.name || (selected === 'All Dates' && category.id === 'all');
        const Icon = category.icon;
        return (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelect(category.name)}
            activeOpacity={0.8}
            style={[styles.chip, isSelected && styles.activeChip]}
          >
            <Icon
              size={14}
              color={isSelected ? Palette.champagne : Palette.mutedText}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
              {category.name}
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activeChip: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.mutedText,
  },
  activeChipText: {
    color: '#FFFCF7',
  },
});
