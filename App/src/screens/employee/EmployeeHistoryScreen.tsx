import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';

export function EmployeeHistoryScreen() {
  return (
    <View style={styles.root}>
      <MapGridBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.sub}>Your past sessions and logs will appear here.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
});
