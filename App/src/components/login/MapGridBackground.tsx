import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
const { width: W } = Dimensions.get('window');

/** Subtle top glow + perspective-style grid for premium dark header */
export function MapGridBackground() {
  const lines = useMemo(() => {
    const count = 14;
    const gap = W / count;
    return Array.from({ length: count + 1 }, (_, i) => i * gap);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ExpoLinearGradient
        colors={['rgba(234, 88, 12, 0.35)', 'rgba(0,0,0,0)', '#000000']}
        locations={[0, 0.45, 1]}
        style={styles.topGlow}
      />
      <Svg width={W} height={220} style={styles.svg}>
        <Defs>
          <LinearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F97316" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#F97316" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={220} fill="url(#gridFade)" />
        {lines.map((x, i) => (
          <Line
            key={`v-${i}`}
            x1={x}
            y1={0}
            x2={x + 40}
            y2={220}
            stroke="rgba(251, 191, 36, 0.12)"
            strokeWidth={1}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Line
            key={`h-${i}`}
            x1={0}
            y1={40 + i * 36}
            x2={W}
            y2={20 + i * 28}
            stroke="rgba(249, 115, 22, 0.1)"
            strokeWidth={1}
          />
        ))}
        <Line
          x1={W * 0.15}
          y1={160}
          x2={W * 0.5}
          y2={95}
          stroke="rgba(251, 191, 36, 0.45)"
          strokeWidth={2}
        />
        <Line
          x1={W * 0.5}
          y1={95}
          x2={W * 0.78}
          y2={55}
          stroke="rgba(249, 115, 22, 0.35)"
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 280,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
