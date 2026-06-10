import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { MapPin, RotateCcw, Check } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export type GeoStamp = {
  /** Primary place line, e.g. "Business Bay, Dubai" */
  place: string;
  /** Full address line (optional) */
  address?: string;
  latitude: number;
  longitude: number;
  /** Pre-formatted local date-time string */
  dateTime: string;
};

type Props = {
  visible: boolean;
  photoUri: string | null;
  stamp: GeoStamp | null;
  onUse: (stampedUri: string) => void;
  onRetake: () => void;
  onCancel: () => void;
};

/**
 * Shows the freshly-captured photo with a "GPS Map Camera"-style geo-stamp
 * burned in. On confirm, flattens the photo + overlay into a single JPEG via
 * react-native-view-shot and returns its file URI.
 */
export function GeoPhotoModal({ visible, photoUri, stamp, onUse, onRetake, onCancel }: Props) {
  const shotRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const handleUse = async () => {
    if (!shotRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(shotRef, {
        format: 'jpg',
        quality: 0.8,
        result: 'tmpfile',
      });
      onUse(uri);
    } catch {
      // Fall back to the un-stamped photo so the user is never blocked.
      if (photoUri) onUse(photoUri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Text style={styles.title}>Confirm photo</Text>

        <View style={styles.shotWrap}>
          {photoUri ? (
            <View ref={shotRef} collapsable={false} style={styles.shot}>
              <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
              {stamp ? (
                <View style={styles.stampPanel}>
                  <View style={styles.stampHeaderRow}>
                    <MapPin size={16} color={Colors.gold} strokeWidth={2.4} />
                    <Text style={styles.stampPlace} numberOfLines={1}>
                      {stamp.place}
                    </Text>
                  </View>
                  {stamp.address ? (
                    <Text style={styles.stampAddr} numberOfLines={2}>
                      {stamp.address}
                    </Text>
                  ) : null}
                  <Text style={styles.stampCoords}>
                    {stamp.latitude.toFixed(6)}°, {stamp.longitude.toFixed(6)}°
                  </Text>
                  <View style={styles.stampFooterRow}>
                    <Text style={styles.stampTime}>{stamp.dateTime}</Text>
                    <Text style={styles.stampBrand}>Pro Map</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.retake]} onPress={onRetake} disabled={busy}>
            <RotateCcw size={20} color={Colors.text} />
            <Text style={styles.retakeTxt}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.use]} onPress={handleUse} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#0B0B0B" />
            ) : (
              <>
                <Check size={20} color="#0B0B0B" strokeWidth={3} />
                <Text style={styles.useTxt}>Use photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', padding: 16, justifyContent: 'center' },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  shotWrap: { alignItems: 'center' },
  shot: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  stampPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  stampHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stampPlace: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '900' },
  stampAddr: { color: '#E5E5E5', fontSize: 12, marginTop: 3, lineHeight: 16 },
  stampCoords: { color: Colors.gold, fontSize: 12, fontWeight: '700', marginTop: 4 },
  stampFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stampTime: { color: '#D4D4D4', fontSize: 11, fontWeight: '600' },
  stampBrand: { color: Colors.orange, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retake: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333' },
  retakeTxt: { color: Colors.text, fontWeight: '800', fontSize: 15 },
  use: { backgroundColor: Colors.orange },
  useTxt: { color: '#0B0B0B', fontWeight: '900', fontSize: 15 },
});
