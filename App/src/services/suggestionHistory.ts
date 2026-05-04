import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE } from '../constants/storageKeys';

const DEFAULTS = [
  'Meeting with Anurag regarding AI',
  'Client call',
  'Site visit',
];

export async function loadSuggestionChips(): Promise<string[]> {
  let history: string[] = [];
  const raw = await AsyncStorage.getItem(STORAGE.SUGGESTION_HISTORY);
  if (raw) {
    try {
      history = JSON.parse(raw) as string[];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }
  const merged = [...DEFAULTS, ...history.filter(Boolean)];
  return [...new Set(merged)].slice(0, 10);
}

export async function rememberSuggestion(text: string): Promise<void> {
  const t = text.trim().slice(0, 160);
  if (t.length < 4) return;
  const raw = await AsyncStorage.getItem(STORAGE.SUGGESTION_HISTORY);
  let history: string[] = [];
  if (raw) {
    try {
      history = JSON.parse(raw) as string[];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }
  history = [t, ...history.filter((x) => x !== t)].slice(0, 30);
  await AsyncStorage.setItem(STORAGE.SUGGESTION_HISTORY, JSON.stringify(history));
}

export async function clearCustomSuggestions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE.SUGGESTION_HISTORY);
}

export { DEFAULTS as DEFAULT_SUGGESTIONS };
