import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Palette } from '../constants/Colors';

export function DataState({ loading, message, onRetry }: { loading?: boolean; message: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: 20, alignItems: 'center', gap: 12 }}>
      {loading && <ActivityIndicator color={Palette.mulberry} />}
      <Text style={{ color: Palette.mutedText, textAlign: 'center' }}>{message}</Text>
      {!loading && onRetry && (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" style={{ padding: 10 }}>
          <Text style={{ color: Palette.mulberry, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
