import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { LOCATION_TASK_NAME } from '../tasks/locationTask';
import { STORAGE } from '../constants/storageKeys';

/** Stops background updates and clears the token used by the headless task. */
export async function stopBackgroundTracking(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (_) {
    /* noop */
  }
  try {
    await SecureStore.deleteItemAsync(STORAGE.BG_TOKEN_KEY);
  } catch (_) {
    /* noop */
  }
}
