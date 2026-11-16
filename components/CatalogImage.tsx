import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { Palette } from '../constants/Colors';
import { categoryArt } from '../constants/categoryArt';
import { resolveImageSource } from '../constants/images';

export function CatalogImage({ url, category = 'ticket', style, iconSize = 50 }: {
  url?: string | null; category?: string; style?: StyleProp<ViewStyle>; iconSize?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const drawing = categoryArt[category as keyof typeof categoryArt] || categoryArt.ticket;
  return <View style={[styles.placeholder, style]}>
    <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={Palette.mulberry} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round"><Path d={drawing} /></Svg>
    {url && failedUrl !== url && <Image source={resolveImageSource(url)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} onError={() => setFailedUrl(url)} />}
  </View>;
}
const styles = StyleSheet.create({ placeholder: { backgroundColor: Palette.secondaryBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } });
