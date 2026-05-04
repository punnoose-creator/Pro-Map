import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config/constants';
import { STORAGE } from '../constants/storageKeys';

export const LOCATION_TASK_NAME = 'promap-background-location-task';

const QUEUE_KEY = 'promap_loc_queue';

type QueuedPing = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  clientRecordedAt: string;
};

async function getAuthToken(): Promise<string | null> {
  const bg = await SecureStore.getItemAsync(STORAGE.BG_TOKEN_KEY);
  if (bg) return bg;
  return SecureStore.getItemAsync(STORAGE.TOKEN_KEY);
}

async function enqueuePing(body: QueuedPing) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list: QueuedPing[] = raw ? JSON.parse(raw) : [];
    list.push(body);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-40)));
  } catch (e) {
    console.warn('enqueuePing failed', e);
  }
}

async function flushQueue(token: string): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  let list: QueuedPing[] = [];
  try {
    list = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return;
  }
  const remaining: QueuedPing[] = [];
  for (const item of list) {
    try {
      await axios.post(`${API_BASE}/locations/ping`, item, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
    } catch {
      remaining.push(item);
      break;
    }
  }
  if (remaining.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(LOCATION_TASK_NAME, error);
    return;
  }
  const token = await getAuthToken();
  if (!token) return;

  await flushQueue(token);

  if (!data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const loc = locations?.[0];
  if (!loc) return;

  const body: QueuedPing = {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    clientRecordedAt: new Date(loc.timestamp).toISOString(),
  };

  try {
    await axios.post(`${API_BASE}/locations/ping`, body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
  } catch {
    await enqueuePing(body);
  }
});
