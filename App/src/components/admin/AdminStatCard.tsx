import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';

type Props = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  style?: ViewStyle;
};

export function AdminStatCard({ label, value, sub, icon, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={['rgba(249,115,22,0.12)', 'rgba(251,191,36,0.06)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.orange,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSubtle,
    fontWeight: '600',
  },
});
