import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Palette } from '../constants/Colors';

/** Two interlocking O's, shared by inline actions and full-page loading states. */
export function BrandLoader({ size = 'small', color = Palette.mulberry, style }: {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const width = typeof size === 'number' ? size : size === 'large' ? 42 : 20;
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(phase);
  }, [phase]);
  const first = useAnimatedStyle(() => ({
    opacity: 0.6 + phase.value * 0.4,
    transform: [{ translateY: phase.value * width * 0.08 }, { scale: 1 - phase.value * 0.06 }, { rotate: '12deg' }],
  }));
  const second = useAnimatedStyle(() => ({
    opacity: 1 - phase.value * 0.4,
    transform: [{ translateY: -phase.value * width * 0.08 }, { scale: 0.94 + phase.value * 0.06 }, { rotate: '12deg' }],
  }));
  const ring = { width: width * 0.67, height: width * 0.77, borderRadius: width, borderWidth: Math.max(1.5, width * 0.09), borderColor: color, left: width * 0.165 };
  return <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading" style={[{ width, height: width * 1.2 }, style]}>
    <Animated.View style={[styles.ring, ring, { top: 0 }, first]} />
    <Animated.View style={[styles.ring, ring, { bottom: 0 }, second]} />
  </View>;
}
const styles = StyleSheet.create({ ring: { position: 'absolute' } });
