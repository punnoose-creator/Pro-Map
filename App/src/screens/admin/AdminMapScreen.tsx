import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { useAdminData } from '../../context/AdminDashboardContext';
import LeafletMapView, { type LeafletMapHandle } from '../../components/maps/LeafletMapView';

export function AdminMapScreen() {
  const { employees, loading, error } = useAdminData();
  const mapRef = useRef<LeafletMapHandle>(null);
  const tabFocused = useIsFocused();

  // Only render the WebView when this tab is focused (belt-and-suspenders with delay).
  const [mapReady, setMapReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => setMapReady(true), 320);
      return () => {
        clearTimeout(t);
        setMapReady(false);
      };
    }, [])
  );

  const markers = useMemo(
    () =>
      employees
        .filter((e) => e.lastPing)
        .map((e) => ({
          id: e._id,
          title: e.fullName,
          latitude: e.lastPing!.latitude,
          longitude: e.lastPing!.longitude,
          color: e.isWorking ? 'green' : 'orange',
        })),
    [employees]
  );

  useEffect(() => {
    if (!tabFocused || !mapReady || markers.length === 0) return;
    mapRef.current?.setData(markers);
  }, [tabFocused, mapReady, markers]);

  return (
    <View style={styles.root}>
      {tabFocused && mapReady && (
        <LeafletMapView
          ref={mapRef}
          style={styles.map}
          onReady={() => {
            if (markers.length > 0) mapRef.current?.setData(markers);
          }}
        />
      )}
      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.banner}>
          {loading && markers.length === 0 ? (
            <ActivityIndicator color={Colors.orange} />
          ) : (
            <Text style={styles.bannerText}>
              {error ? error : `${markers.length} on map (employees with recent GPS)`}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  banner: {
    margin: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
  },
  bannerText: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
});
