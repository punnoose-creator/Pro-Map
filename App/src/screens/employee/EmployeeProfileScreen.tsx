import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';

export function EmployeeProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.root}>
      <MapGridBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.rowLabel}>Name</Text>
        <Text style={styles.rowValue}>{user?.fullName ?? '—'}</Text>
        <Text style={styles.rowLabel}>Email</Text>
        <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
        <Text style={styles.rowLabel}>Department</Text>
        <Text style={styles.rowValue}>{user?.department ?? '—'}</Text>
        <TouchableOpacity style={styles.outline} onPress={() => logout()}>
          <Text style={styles.outlineText}>Log out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  rowLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', marginTop: 12 },
  rowValue: { fontSize: 16, color: Colors.text, marginTop: 4 },
  outline: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineText: { color: Colors.gold, fontWeight: '700' },
});
