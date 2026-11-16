import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from './BrandLogo';
import { AnimatedLogoLoader } from './AnimatedLogoLoader';
import { Palette } from '../constants/Colors';

export function LaunchSplash({ onFinish }: { onFinish: () => void }) {
  const opacity = useState(() => new Animated.Value(1))[0];
  const reveal = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(reveal, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2250),
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) onFinish(); });
    return () => animation.stop();
  }, [onFinish, opacity, reveal]);
  return (
    <Animated.View style={[styles.screen, { opacity }]} accessibilityLabel="Couple Of Offers is opening">
      <View style={styles.orbit} />
      <View style={styles.orbitInner} />
      <Animated.View style={{ opacity: reveal, alignItems: 'center', transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <AnimatedLogoLoader size={64} title="" caption="" />
        <BrandLogo height={48} showSlogan={false} />
        <Text style={styles.slogan}>Great Experiences, Better Offers</Text>
      </Animated.View>
      <Text style={styles.footer}>A LITTLE TIME. A GREAT EXPERIENCE.</Text>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, zIndex: 10000, backgroundColor: Palette.porcelain, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbit: { position: 'absolute', width: 500, height: 500, borderRadius: 250, borderWidth: 1, borderColor: '#E5C99A60', transform: [{ rotate: '20deg' }, { scaleX: 0.8 }] },
  orbitInner: { position: 'absolute', width: 360, height: 360, borderRadius: 180, borderWidth: 1, borderColor: '#743D6012' },
  slogan: { marginTop: 14, color: Palette.goldInk, fontSize: 12, letterSpacing: 0.5, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 60, color: Palette.mutedText, fontSize: 9, letterSpacing: 2 },
});
