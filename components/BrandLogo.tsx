import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandWordmark } from './BrandWordmark';
import { Palette } from '../constants/Colors';

interface BrandLogoProps {
  height?: number;
  letterColor?: string;
  slogan?: string;
  showSlogan?: boolean;
}

export function BrandLogo({
  height = 28,
  letterColor = Palette.aubergine,
  slogan = 'Great Experiences, Better Offers',
  showSlogan = true,
}: BrandLogoProps) {
  return (
    <View style={styles.container}>
      <BrandWordmark height={height} letterColor={letterColor} />
      {showSlogan && (
        <Text style={styles.slogan} numberOfLines={1} ellipsizeMode="clip">{slogan}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  slogan: {
    fontSize: 7,
    fontWeight: '700',
    color: Palette.goldInk,
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
