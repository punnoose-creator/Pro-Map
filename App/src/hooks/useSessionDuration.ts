import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE } from '../constants/storageKeys';

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '0m';
}

/** Live “Working for …” label while a session is active. */
export function useSessionDuration(isActive: boolean) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      setLabel(null);
      return;
    }

    const tick = async () => {
      const iso = await AsyncStorage.getItem(STORAGE.WORK_SESSION_START);
      if (!iso) {
        setLabel(null);
        return;
      }
      const start = new Date(iso).getTime();
      if (Number.isNaN(start)) {
        setLabel(null);
        return;
      }
      setLabel(`Working for ${formatDuration(Date.now() - start)}`);
    };

    void tick();
    const id = setInterval(() => void tick(), 15_000);
    return () => clearInterval(id);
  }, [isActive]);

  return label;
}
