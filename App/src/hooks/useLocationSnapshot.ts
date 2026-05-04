import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export function useLocationSnapshot() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        setError('Location services are off. Turn on GPS and try again.');
        setCoords(null);
        return;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied.');
        setCoords(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setError('Could not capture your current location.');
      setCoords(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, error, loading, refresh };
}
