import React from 'react';
import Svg, { G, Ellipse, Path } from 'react-native-svg';

interface BrandEmblemProps {
  size?: number;
  ringColor?: string;
  accentColor?: string;
}

export function BrandEmblem({
  size = 32,
  ringColor = '#965276',
  accentColor = '#E4BB81',
}: BrandEmblemProps) {
  // Original aspect ratio: 40 width x 72 height
  const width = size;
  const height = (size * 72) / 40;

  return (
    <Svg width={width} height={height} viewBox="0 0 40 72">
      <G
        transform="translate(20, 0) rotate(12, 0, 36)"
        fill="none"
        stroke={ringColor}
        strokeWidth="5"
      >
        <Ellipse cy="26" rx="13" ry="16" />
        <Ellipse cy="49" rx="13" ry="16" />
        <Path d="M-10.8 34.2 Q-7.5 40 0 42" stroke={accentColor} strokeWidth="4.8" />
      </G>
    </Svg>
  );
}
