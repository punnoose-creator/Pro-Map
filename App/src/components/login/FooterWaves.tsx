import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
const W = Dimensions.get('window').width;

export function FooterWaves() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={W} height={48} viewBox={`0 0 ${W} 48`}>
        <Path
          d={`M0 36 Q ${W * 0.25} 20 ${W * 0.5} 32 T ${W} 28 L ${W} 48 L 0 48 Z`}
          fill="rgba(249, 115, 22, 0.08)"
        />
        <Path
          d={`M0 40 Q ${W * 0.3} 30 ${W * 0.55} 38 T ${W} 34`}
          stroke="rgba(251, 191, 36, 0.25)"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 'auto',
    opacity: 0.9,
  },
});
