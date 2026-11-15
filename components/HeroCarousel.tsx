import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { resolveImageSource, LOCAL_ASSETS } from '../constants/images';
import { Config } from '../constants/config';
import type { HomepageSlide } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32;

// Exact 1:1 bundled web image mapping for the 3 homepage hero slides
const WEB_SLIDE_IMAGES: Record<string, any> = {
  'welcome': require('../assets/images/terrace-evening.jpg'),
  'curated-experiences': require('../assets/images/curated-experiences-couples.webp'),
  'friends': require('../assets/images/group-friends-dining.jpg'),
  'terrace-evening.jpg': require('../assets/images/terrace-evening.jpg'),
  'curated-experiences-couples.webp': require('../assets/images/curated-experiences-couples.webp'),
  'group-friends-dining.jpg': require('../assets/images/group-friends-dining.jpg'),
};

function getHeroSlideSource(item: HomepageSlide): any {
  // 1. Direct slide ID mapping (matches web/app/page.tsx: welcome, curated-experiences, friends)
  if (WEB_SLIDE_IMAGES[item.id]) {
    return WEB_SLIDE_IMAGES[item.id];
  }
  // 2. By image filename
  if (item.image) {
    const cleanUrl = item.image.split('?')[0];
    const filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1).trim();
    if (WEB_SLIDE_IMAGES[filename]) {
      return WEB_SLIDE_IMAGES[filename];
    }
    if (LOCAL_ASSETS[filename]) {
      return LOCAL_ASSETS[filename];
    }
  }
  // 3. Fallback
  return resolveImageSource(item.image, Config.FALLBACK_HERO_IMAGE);
}

interface HeroCarouselProps {
  slides: HomepageSlide[];
  onActionPress?: (slide: HomepageSlide) => void;
}

export function HeroCarousel({ slides, onActionPress }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isInteracting = useRef(false);

  // Auto-slide every 7 seconds, matching web behavior
  useEffect(() => {
    if (!slides || slides.length < 2) return;
    const interval = setInterval(() => {
      if (!isInteracting.current) {
        setActiveIndex((prev) => {
          const nextIndex = (prev + 1) % slides.length;
          flatListRef.current?.scrollToOffset({
            offset: nextIndex * (SLIDE_WIDTH + 12),
            animated: true,
          });
          return nextIndex;
        });
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [slides]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (SLIDE_WIDTH + 12));
    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToOffset({
      offset: index * (SLIDE_WIDTH + 12),
      animated: true,
    });
  };

  if (!slides || slides.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={SLIDE_WIDTH + 12}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => {
          isInteracting.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            isInteracting.current = false;
          }, 4000);
        }}
        renderItem={({ item }) => (
          <View style={styles.slideCard}>
            {/* Exact Web Image from bundled assets (terrace-evening, curated-experiences-couples, group-friends-dining) */}
            <Image
              source={getHeroSlideSource(item)}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            {/* Dark gradient scrim matching web app for high legibility */}
            <View style={styles.scrimOverlay} />

            <View style={styles.content}>
              {/* Exact Web Typography: Headline + Accent on next line in Champagne */}
              <Text style={styles.headline} numberOfLines={2}>
                {item.headline}
                {'\n'}
                <Text style={styles.accentText}>{item.accent}</Text>
              </Text>

              <Text style={styles.copyText} numberOfLines={2}>
                {item.copy}
              </Text>

              {item.action ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => onActionPress?.(item)}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>{item.action}</Text>
                  <ArrowRight size={13} color={Palette.aubergine} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Pagination indicators styled exactly like web banner */}
      {slides.length > 1 && (
        <View style={styles.paginationRow}>
          {slides.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleDotPress(idx)}
                style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]}
                activeOpacity={0.8}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  slideCard: {
    width: SLIDE_WIDTH,
    height: 205, // Compact reduced height for sleek mobile layout
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Palette.aubergine,
    borderWidth: 1,
    borderColor: 'rgba(229, 201, 154, 0.22)',
    shadowColor: '#301D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 12, 26, 0.42)', // Vibrant transparent tint so photo shines through clearly
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FAF5ED',
    lineHeight: 25,
    letterSpacing: -0.4,
    marginBottom: 4,
    fontFamily: 'System',
  },
  accentText: {
    color: '#E5C99A',
    fontWeight: '800',
  },
  copyText: {
    fontSize: 12,
    color: 'rgba(250, 245, 237, 0.90)',
    lineHeight: 16,
    marginBottom: 10,
    maxWidth: '92%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.champagne,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.aubergine,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: Palette.champagne,
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'rgba(116, 61, 96, 0.28)',
  },
});
