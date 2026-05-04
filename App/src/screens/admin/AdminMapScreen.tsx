import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../theme/colors';
import { useAdminData } from '../../context/AdminDashboardContext';

const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

export function AdminMapScreen() {
  const { employees, loading, error } = useAdminData();

  const markers = useMemo(
    () =>
      employees
        .filter((e) => e.lastPing)
        .map((e) => ({
          id: e._id,
          title: e.fullName,
          coordinate: {
            latitude: e.lastPing!.latitude,
            longitude: e.lastPing!.longitude,
          },
        })),
    [employees]
  );

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
      >
        {markers.map((m) => (
          <Marker key={m.id} coordinate={m.coordinate} title={m.title} />
        ))}
      </MapView>
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
  map: { ...StyleSheet.absoluteFillObject },
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
