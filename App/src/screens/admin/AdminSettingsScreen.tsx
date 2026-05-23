import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import {
  clearCrashDebugBuffer,
  getCrashDebugText,
} from '../../debug/crashDebugBuffer';

export function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const [, refresh] = useState(0);

  const logText = useMemo(() => getCrashDebugText(), [refresh]);
  const entryCount = useMemo(() => (logText ? logText.split(/\n---\n\n/).length : 0), [logText]);

  const bump = useCallback(() => refresh((n) => n + 1), []);

  const onShowLog = useCallback(() => {
    const body =
      logText ||
      'No entries yet.\n\nIf the app closes instantly, the crash is usually NATIVE (not JavaScript). Installed APKs do not print to your PC Command Prompt — use USB debugging and adb logcat.';
    Alert.alert(
      'Diagnostics (in-app)',
      body.length > 3200 ? `${body.slice(0, 3200)}\n\n…(truncated — use Share for full log)` : body,
      [{ text: 'OK' }]
    );
  }, [logText]);

  const onShareLog = useCallback(() => {
    const body =
      logText ||
      '(Empty — native-only crash: capture adb logcat on USB. JS errors appear here after they occur.)';
    void Share.share({ title: 'Pro Map diagnostics', message: body.slice(0, 45000) }).catch(() =>
      Alert.alert('Could not open share sheet', 'Try “Show log” to read text on screen.')
    );
  }, [logText]);

  const onClearLog = useCallback(() => {
    clearCrashDebugBuffer();
    bump();
  }, [bump]);

  return (
    <View style={styles.root}>
      <View style={styles.bg}>
        <MapGridBackground />
      </View>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Settings</Text>

          <View style={styles.diagCard}>
            <Text style={styles.diagTitle}>Diagnostics</Text>
            <Text style={styles.diagBody}>
              This log only captures JavaScript and WebView callbacks. If the app dies with no new lines
              after you open the map, the failure is likely in native code (Chromium / GPU). Release APKs do
              not send output to Metro — use{' '}
              <Text style={styles.diagMono}>adb logcat</Text> with USB debugging.
            </Text>
            <Text style={styles.diagMeta}>
              Buffered entries: {entryCount || 0}
              {logText ? ` · ~${logText.length} chars` : ''}
            </Text>
            <View style={styles.diagRow}>
              <TouchableOpacity style={styles.diagBtn} onPress={onShowLog}>
                <Text style={styles.diagBtnTxt}>Show log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.diagBtn} onPress={() => void onShareLog()}>
                <Text style={styles.diagBtnTxt}>Share log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.diagBtnGhost} onPress={onClearLog}>
                <Text style={styles.diagBtnGhostTxt}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

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
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  safe: { flex: 1, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: 16 },
  diagCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
    padding: 16,
    marginBottom: 18,
  },
  diagTitle: { fontSize: 16, fontWeight: '900', color: Colors.orange, marginBottom: 8 },
  diagBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 10 },
  diagMono: { fontFamily: 'monospace', color: Colors.gold, fontSize: 12 },
  diagMeta: { color: Colors.textSubtle, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  diagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  diagBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  diagBtnTxt: { color: Colors.orange, fontWeight: '900', fontSize: 13 },
  diagBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  diagBtnGhostTxt: { color: '#aaa', fontWeight: '700', fontSize: 13 },
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
