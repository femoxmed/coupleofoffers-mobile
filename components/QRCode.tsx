import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { generateQrMatrix, ErrorCorrectionLevel } from './qr-generator';

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: ErrorCorrectionLevel;
  quietZone?: number;
  style?: StyleProp<ViewStyle>;
}

export function QRCode({
  value,
  size = 100,
  bgColor = '#FFFFFF',
  fgColor = '#301D32',
  level = 'M',
  quietZone = 2,
  style,
}: QRCodeProps) {
  const { path, totalSize } = useMemo(() => {
    try {
      const matrix = generateQrMatrix(value, level);
      const matrixSize = matrix.length;
      const total = matrixSize + quietZone * 2;
      let d = '';

      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (matrix[r][c]) {
            const x = c + quietZone;
            const y = r + quietZone;
            d += `M${x},${y}h1v1h-1z `;
          }
        }
      }

      return { path: d, totalSize: total };
    } catch (e) {
      console.warn('Failed to generate QR code matrix', e);
      return { path: '', totalSize: 25 };
    }
  }, [value, level, quietZone]);

  if (!path) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, backgroundColor: bgColor },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        width={size}
        height={size}
      >
        <Rect width={totalSize} height={totalSize} fill={bgColor} />
        <Path d={path} fill={fgColor} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 8,
  },
});
