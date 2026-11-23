import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ShieldCheck, Utensils, Ticket } from 'lucide-react-native';
import { Palette } from '../constants/Colors';

const TRUST_PILLARS = [
  {
    id: 'inclusive',
    icon: Utensils,
    title: 'All-Inclusive Menus',
    desc: 'One upfront price for two. Zero surprise charges.',
  },
  {
    id: 'guaranteed',
    icon: ShieldCheck,
    title: 'Guaranteed Tables',
    desc: 'Instant confirmed table reserved directly with the venue.',
  },
  {
    id: 'pass',
    icon: Ticket,
    title: 'Digital Pass at Door',
    desc: 'Seamless arrival — simply show your pass on arrival.',
  },
];

export function TrustPropositionBanner() {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={244}
      >
        {TRUST_PILLARS.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.iconCircle}>
                <Icon size={16} color={Palette.mulberry} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.desc}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 236,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7E0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    shadowColor: Palette.aubergine,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3ECE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.aubergine,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  cardDesc: {
    fontSize: 11,
    color: Palette.mutedText,
    lineHeight: 14.5,
  },
});
