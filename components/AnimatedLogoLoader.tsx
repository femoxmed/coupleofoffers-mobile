import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BrandEmblem } from './BrandEmblem';
import { Palette } from '../constants/Colors';

interface AnimatedLogoLoaderProps {
  size?: number;
  title?: string;
  caption?: string;
  fullScreen?: boolean;
}

export function AnimatedLogoLoader({
  size = 46,
  title = 'Couple Of Offers',
  caption = 'Curating memorable date experiences…',
  fullScreen = false,
}: AnimatedLogoLoaderProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Subtle breathing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle gentle float sway
    rotation.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1.5, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Ambient aura pulsation
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [scale, rotation, auraScale, auraOpacity]);

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      {/* Ambient background aura glow */}
      <Animated.View
        style={[
          styles.aura,
          {
            width: size * 2.8,
            height: size * 2.8,
            borderRadius: (size * 2.8) / 2,
          },
          auraAnimatedStyle,
        ]}
      />

      {/* Animated Brand Emblem */}
      <Animated.View style={emblemAnimatedStyle}>
        <BrandEmblem size={size} ringColor={Palette.mulberry} accentColor={Palette.champagne} />
      </Animated.View>

      {/* Typography */}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
  },
  fullScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.porcelain,
    zIndex: 999,
  },
  aura: {
    position: 'absolute',
    backgroundColor: 'rgba(228, 187, 129, 0.22)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.aubergine,
    marginTop: 18,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  caption: {
    fontSize: 12,
    color: Palette.mutedText,
    marginTop: 4,
    textAlign: 'center',
  },
});
