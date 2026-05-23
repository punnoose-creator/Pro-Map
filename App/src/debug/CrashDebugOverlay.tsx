import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearCrashDebugBuffer,
  getCrashDebugText,
  subscribeCrashDebugBuffer,
} from './crashDebugBuffer';

/** Floating log viewer: __DEV__ always, or set `expo.extra.debugCrashPanel: true` in app.json for release/preview APKs. */
export function CrashDebugOverlay() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [logText, setLogText] = useState('');

  const enabled = __DEV__ || (Constants.expoConfig?.extra as { debugCrashPanel?: boolean } | undefined)?.debugCrashPanel === true;

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setLogText(getCrashDebugText());
    refresh();
    return subscribeCrashDebugBuffer(refresh);
  }, [enabled]);

  const onShare = useCallback(async () => {
    const body = getCrashDebugText() || '(empty — no JS/WebView errors captured yet)';
    try {
      await Share.share({
        title: 'Pro Map debug log',
        message: body.slice(0, 45000),
      });
    } catch {
      /* noop */
    }
  }, []);

  if (!enabled) return null;

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="Open debug error log"
        style={[styles.fab, { bottom: 24 + insets.bottom, right: 12 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabTxt}>DBG</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.sheetTitle}>Error log (in-app)</Text>
            <Text style={styles.sheetNote}>
              Shows JavaScript errors, React render errors, and WebView callbacks (onError, render process
              gone, Leaflet webError). If the whole app disappears with no line here, it is usually a native
              crash — use adb logcat on Android.
            </Text>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPad}>
              <Text selectable style={styles.mono}>
                {logText || 'No entries yet.'}
              </Text>
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => clearCrashDebugBuffer()}>
                <Text style={styles.btnGhostTxt}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => void onShare()}>
                <Text style={styles.btnGhostTxt}>Share log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setOpen(false)}>
                <Text style={styles.btnPrimaryTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 12,
    backgroundColor: 'rgba(249,115,22,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  fabTxt: { color: '#111', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: Platform.OS === 'android' ? '88%' : '85%',
    backgroundColor: '#121212',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  sheetNote: { color: '#888', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  scroll: { flexGrow: 0, maxHeight: 420, borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10 },
  scrollPad: { padding: 10 },
  mono: { color: '#e5e5e5', fontSize: 11, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    justifyContent: 'flex-end',
  },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  btnGhostTxt: { color: '#ccc', fontWeight: '700', fontSize: 13 },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#f97316',
  },
  btnPrimaryTxt: { color: '#111', fontWeight: '900', fontSize: 13 },
});
