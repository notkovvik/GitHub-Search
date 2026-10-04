import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'favorites_v2';

export type FavRepo = {
  id: number; owner: string; name: string;
  description?: string | null; language?: string | null;
  stars: number; url: string; addedAt: number;
};
export type FavUser = {
  login: string; avatar_url: string; name?: string | null; addedAt: number;
};

type Store = { repos: FavRepo[]; users: FavUser[] };

let cache: Store | null = null;
const listeners = new Set<() => void>();

export async function loadFavs(): Promise<Store> {
  if (cache) return cache;
  try { cache = JSON.parse((await AsyncStorage.getItem(KEY)) || '{"repos":[],"users":[]}'); }
  catch { cache = { repos: [], users: [] }; }
  return cache!;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function subscribeFavs(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function toggleRepo(r: Omit<FavRepo, 'addedAt'>) {
  const s = await loadFavs();
  const i = s.repos.findIndex((x) => x.id === r.id);
  if (i >= 0) s.repos.splice(i, 1);
  else s.repos.unshift({ ...r, addedAt: Date.now() });
  await persist();
}

export async function toggleUser(u: Omit<FavUser, 'addedAt'>) {
  const s = await loadFavs();
  const i = s.users.findIndex((x) => x.login === u.login);
  if (i >= 0) s.users.splice(i, 1);
  else s.users.unshift({ ...u, addedAt: Date.now() });
  await persist();
}

export const isRepoFav = async (id: number) => (await loadFavs()).repos.some((r) => r.id === id);
export const isUserFav = async (login: string) => (await loadFavs()).users.some((u) => u.login === login);