import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandLoader } from './BrandLoader';
import { Palette } from '../constants/Colors';

interface AnimatedLogoLoaderProps {
  size?: number;
  title?: string;
  caption?: string;
  fullScreen?: boolean;
}
export function AnimatedLogoLoader({ size = 46, title = 'Couple Of Offers', caption = 'Curating memorable date experiences…', fullScreen = false }: AnimatedLogoLoaderProps) {
  return <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <BrandLoader size={size} />
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {caption ? <Text style={styles.caption}>{caption}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullScreen: { ...StyleSheet.absoluteFill, backgroundColor: Palette.porcelain, zIndex: 999 },
  title: { fontSize: 16, fontWeight: '700', color: Palette.aubergine, marginTop: 18, textAlign: 'center', letterSpacing: -0.2 },
  caption: { fontSize: 12, color: Palette.mutedText, marginTop: 4, textAlign: 'center' },
});
