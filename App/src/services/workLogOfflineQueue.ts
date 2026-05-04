import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config/constants';
import { STORAGE } from '../constants/storageKeys';
import type { WorkLogPayload } from './workLogApi';

async function readQueue(): Promise<WorkLogPayload[]> {
  const raw = await AsyncStorage.getItem(STORAGE.OFFLINE_WORK_QUEUE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WorkLogPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineWork(item: WorkLogPayload): Promise<void> {
  const q = await readQueue();
  q.push(item);
  await AsyncStorage.setItem(STORAGE.OFFLINE_WORK_QUEUE, JSON.stringify(q.slice(-30)));
}

export async function clearOfflineWorkQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE.OFFLINE_WORK_QUEUE);
}

/** Sends queued entries in order until one fails or queue is empty. */
export async function flushOfflineWorkQueue(): Promise<{ sent: number; pending: number }> {
  const auth = axios.defaults.headers.common.Authorization;
  if (!auth || typeof auth !== 'string') {
    return { sent: 0, pending: (await readQueue()).length };
  }

  const remaining = [...(await readQueue())];
  if (!remaining.length) return { sent: 0, pending: 0 };

  let sent = 0;
  while (remaining.length) {
    const item = remaining[0];
    try {
      await axios.post(`${API_BASE}/log-entry`, item, { timeout: 25000 });
      remaining.shift();
      sent++;
    } catch {
      break;
    }
  }

  if (remaining.length) {
    await AsyncStorage.setItem(STORAGE.OFFLINE_WORK_QUEUE, JSON.stringify(remaining));
  } else {
    await AsyncStorage.removeItem(STORAGE.OFFLINE_WORK_QUEUE);
  }

  return { sent, pending: remaining.length };
}
