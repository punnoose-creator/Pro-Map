import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '../tasks/locationTask';
import { STORAGE } from '../constants/storageKeys';
import { stopBackgroundTracking } from '../services/locationLifecycle';
import { startShift, stopShift } from '../services/shiftApi';

const INTERVAL_MS = 5 * 60 * 1000;

export function useWorkLocation(token: string | null) {
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (alive) setIsTracking(started);
      } catch {
        if (alive) setIsTracking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(async () => {
    setErrorMsg(null);
    if (!token) {
      setErrorMsg('Not signed in');
      return false;
    }

    const services = await Location.hasServicesEnabledAsync();
    if (!services) {
      Alert.alert(
        'Location services are off',
        'Turn on GPS so Pro Map can record your work route.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ]
      );
      return false;
    }

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      Alert.alert(
        'Location permission needed',
        'Pro Map uses your location during an active work session to send updates about every 5 minutes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App settings', onPress: () => void Linking.openSettings() },
        ]
      );
      return false;
    }

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      const msg =
        Platform.OS === 'ios'
          ? 'Please select "Always" in location settings so tracking continues when the screen is off.'
          : 'Please allow "Allow all the time" so tracking can continue when the screen is off.';
      Alert.alert('Background location', msg, [
        { text: 'OK', onPress: () => void Linking.openSettings() },
      ]);
      return false;
    }

    try {
      await SecureStore.setItemAsync(STORAGE.BG_TOKEN_KEY, token);
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: INTERVAL_MS,
        distanceInterval: 0,
        // foregroundService is Android-only; expo-location ignores it on iOS
        ...(Platform.OS === 'android' && {
          foregroundService: {
            notificationTitle: 'Pro Map',
            notificationBody: 'Work location tracking is active.',
            notificationColor: '#F97316',
          },
        }),
      });
      await AsyncStorage.setItem(STORAGE.WORK_SESSION_START, new Date().toISOString());
      // Open a work shift so the admin dashboard reflects "active now" + work hours.
      // Tracking has already started, so don't fail the whole start on a shift error.
      try {
        await startShift(token);
      } catch (shiftErr) {
        console.warn('startShift failed', shiftErr);
      }
      setIsTracking(true);
      return true;
    } catch (e) {
      console.error(e);
      await SecureStore.deleteItemAsync(STORAGE.BG_TOKEN_KEY).catch(() => {});
      setErrorMsg('Could not start tracking');
      Alert.alert('Tracking error', 'Could not start work tracking. Please try again.');
      return false;
    }
  }, [token]);

  const stop = useCallback(async () => {
    await stopBackgroundTracking();
    await AsyncStorage.removeItem(STORAGE.WORK_SESSION_START);
    // Close the open shift; don't block the local stop if the call fails.
    try {
      await stopShift(token);
    } catch (shiftErr) {
      console.warn('stopShift failed', shiftErr);
    }
    setIsTracking(false);
    return true;
  }, [token]);

  return { isTracking, start, stop, errorMsg };
}
