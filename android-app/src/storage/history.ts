import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'history_v1';
const MAX = 20;

export async function pushHistory(q: string) {
  const v = q.trim();
  if (!v) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const filtered = [v, ...arr.filter((x) => x !== v)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {}
}

export async function loadHistory(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); } catch { return []; }
}

export async function clearHistory() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}