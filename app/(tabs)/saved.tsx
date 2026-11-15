import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Heart, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Palette } from '../../constants/Colors';
import { useSavedStore } from '../../store/useSavedStore';
import { OfferCard } from '../../components/OfferCard';
import type { Offer } from '../../types';

export default function SavedScreen() {
  const router = useRouter();
  const { savedOffers, fetchSaved } = useSavedStore();

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return (
    <View style={styles.container}>
      {savedOffers.length > 0 ? (
        <FlatList
          data={savedOffers as unknown as Offer[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OfferCard offer={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Heart size={36} color={Palette.mulberry} />
          </View>
          <Text style={styles.emptyTitle}>No saved date experiences yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any offer in Explore to save it here for later.
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
          >
            <Compass size={16} color="#FFFCF7" style={{ marginRight: 8 }} />
            <Text style={styles.exploreButtonText}>Browse Date Experiences</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.porcelain,
  },
  listContent: {
    paddingVertical: 14,
    paddingBottom: 130,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 90,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Palette.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.mulberry,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    color: '#FFFCF7',
    fontWeight: '700',
    fontSize: 14,
  },
});
