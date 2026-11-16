import React, { useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View, type FlatListProps, type ScrollViewProps } from 'react-native';
import { BrandLoader } from './BrandLoader';
import { Palette } from '../constants/Colors';

export function BrandRefreshScrollView({ refreshing, onRefresh, children, onScroll, onTouchStart, onTouchMove, onTouchEnd, ...props }: Omit<ScrollViewProps, 'refreshControl'> & { refreshing: boolean; onRefresh: () => void }) {
  const [pulling, setPulling] = useState(false);
  const offset = useRef(0);
  const touchY = useRef(0);
  return <View style={styles.container}>
    {(refreshing || pulling) && <View pointerEvents="none" style={styles.indicator}><BrandLoader size={28} /></View>}
    <ScrollView {...props} style={[props.style, styles.content]} contentContainerStyle={[styles.contentSurface, props.contentContainerStyle]} alwaysBounceVertical scrollEventThrottle={16}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; setPulling(offset.current < -12); onScroll?.(event); }}
      onTouchStart={event => { touchY.current = event.nativeEvent.pageY; onTouchStart?.(event); }}
      onTouchMove={event => { if (offset.current <= 0) setPulling(event.nativeEvent.pageY - touchY.current > 16); onTouchMove?.(event); }}
      onTouchEnd={event => { setPulling(false); onTouchEnd?.(event); }}
      onTouchCancel={() => setPulling(false)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />}
    >{children}</ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  content: { zIndex: 1 },
  contentSurface: { backgroundColor: Palette.porcelain },
  indicator: { position: 'absolute', top: 18, alignSelf: 'center', zIndex: 0 },
});

export function BrandRefreshFlatList<T>({ refreshing, onRefresh, onScroll, onTouchStart, onTouchMove, onTouchEnd, ...props }: Omit<FlatListProps<T>, 'refreshControl' | 'refreshing' | 'onRefresh'> & { refreshing: boolean; onRefresh: () => void }) {
  const [pulling, setPulling] = useState(false);
  const offset = useRef(0);
  const touchY = useRef(0);
  return <View style={styles.container}>
    {(refreshing || pulling) && <View pointerEvents="none" style={styles.indicator}><BrandLoader size={28} /></View>}
    <FlatList {...props} style={[props.style, styles.content]} contentContainerStyle={[styles.contentSurface, props.contentContainerStyle]} alwaysBounceVertical scrollEventThrottle={16}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; setPulling(offset.current < -12); onScroll?.(event); }}
      onTouchStart={event => { touchY.current = event.nativeEvent.pageY; onTouchStart?.(event); }}
      onTouchMove={event => { if (offset.current <= 0) setPulling(event.nativeEvent.pageY - touchY.current > 16); onTouchMove?.(event); }}
      onTouchEnd={event => { setPulling(false); onTouchEnd?.(event); }}
      onTouchCancel={() => setPulling(false)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />}
    />
  </View>;
}
