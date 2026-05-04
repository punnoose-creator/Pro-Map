import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';

export function GradientTitle() {
  return (
    <View style={styles.wrap}>
      <MaskedView
        style={styles.mask}
        maskElement={
          <View style={styles.maskInner}>
            <Text style={styles.titleMask}>PRO MAP</Text>
          </View>
        }
      >
        <LinearGradient
          colors={[Colors.orange, Colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
      <Text style={styles.tagline}>TRACK • WORK • REPORT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 8 },
  mask: { height: 52, justifyContent: 'center', alignSelf: 'center', width: '100%' },
  maskInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleMask: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    color: Colors.text,
  },
  tagline: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.72)',
  },
});
