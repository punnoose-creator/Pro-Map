import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from '../tasks/locationTask';

export const useLocationTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startTracking = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setErrorMsg('Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        setErrorMsg('Background location permission denied');
        return false;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5 * 60 * 1000, // 5 minutes
        distanceInterval: 10, // 10 meters
        foregroundService: {
          notificationTitle: 'Field IQ Tracking',
          notificationBody: 'Tracking your work location in the background.',
          notificationColor: '#ffc0a8',
        },
      });

      setIsTracking(true);
      return true;
    } catch (err) {
      console.error('Failed to start tracking:', err);
      setErrorMsg('Failed to start tracking');
      return false;
    }
  };

  const stopTracking = async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      setIsTracking(false);
      return true;
    } catch (err) {
      console.error('Failed to stop tracking:', err);
      return false;
    }
  };

  useEffect(() => {
    const checkTrackingStatus = async () => {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(hasStarted);
    };
    checkTrackingStatus();
  }, []);

  return { isTracking, startTracking, stopTracking, errorMsg };
};
