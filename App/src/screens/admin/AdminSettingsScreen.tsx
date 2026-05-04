import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';

export function AdminSettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.root}>
      <View style={styles.bg}>
        <MapGridBackground />
      </View>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.fullName ?? user?.email}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role ?? '—'}</Text>
        </View>
        <TouchableOpacity
          style={styles.outline}
          onPress={() =>
            Alert.alert('Admin controls', 'Additional controls can be wired here (API keys, roles).')
          }
        >
          <Text style={styles.outlineText}>Admin controls</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.danger} onPress={() => void logout()}>
          <Text style={styles.dangerText}>Log out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  safe: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 18,
    marginBottom: 16,
  },
  label: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', marginTop: 10 },
  value: { fontSize: 16, color: Colors.text, marginTop: 4 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  outlineText: { color: Colors.gold, fontWeight: '800' },
  danger: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  dangerText: { color: Colors.error, fontWeight: '800' },
});
