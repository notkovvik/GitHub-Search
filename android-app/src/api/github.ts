import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredToken } from '../auth/deviceFlow';

const BASE = 'https://api.github.com';
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_PREFIX = 'gh_cache:';

let lastRate: { remaining: number; limit: number; reset: number; at: number } | null = null;
export const getRate = () => lastRate;

async function cacheGet(key: string) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL) { await AsyncStorage.removeItem(CACHE_PREFIX + key); return null; }
    return v;
  } catch { return null; }
}

async function cacheSet(key: string, v: any) {
  try { await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v })); } catch {}
}

export async function cacheClear() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(CACHE_PREFIX)));
  } catch {}
}

export class ApiError extends Error {
  status: number;
  code?: 'RATE_LIMIT' | 'NOT_FOUND' | 'NETWORK';
  constructor(msg: string, status: number, code?: ApiError['code']) {
    super(msg); this.status = status; this.code = code;
  }
}

export async function api<T = any>(path: string, opts: { cache?: boolean } = {}): Promise<T> {
  const useCache = opts.cache !== false;
  if (useCache) {
    const hit = await cacheGet(path);
    if (hit) return hit as T;
  }

  const token = await getStoredToken();
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(BASE + path, { headers, signal: ctrl.signal });

    const rem = res.headers.get('X-RateLimit-Remaining');
    const lim = res.headers.get('X-RateLimit-Limit');
    const rst = res.headers.get('X-RateLimit-Reset');
    if (rem && lim) {
      lastRate = { remaining: +rem, limit: +lim, reset: +(rst || 0), at: Date.now() };
    }

    if (!res.ok) {
      if (res.status === 404) throw new ApiError('not_found', 404, 'NOT_FOUND');
      if (res.status === 403 || res.status === 429) throw new ApiError('rate_limit', res.status, 'RATE_LIMIT');
      throw new ApiError('http_' + res.status, res.status);
    }
    const data = await res.json();
    if (useCache) await cacheSet(path, data);
    return data;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new ApiError('timeout', 0, 'NETWORK');
    if (e instanceof ApiError) throw e;
    throw new ApiError('network', 0, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

export const gh = {
  user: (login: string) => api(`/users/${encodeURIComponent(login)}`),
  me: () => api('/user', { cache: false }),

  repos: async (login: string) => {
    const all: any[] = [];
    for (let page = 1; ; page++) {
      const batch = await api<any[]>(
        `/users/${encodeURIComponent(login)}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
      );
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  },

  repo: (owner: string, name: string) =>
    api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`),

  searchUsers: (q: string, page = 1) =>
    api(`/search/users?q=${encodeURIComponent(q)}&per_page=20&page=${page}`),

  searchRepos: (q: string, page = 1) =>
    api(`/search/repositories?q=${encodeURIComponent(q)}&per_page=20&page=${page}&sort=stars&order=desc`),

  releases: (owner: string, name: string) =>
    api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/latest`),

  languages: (owner: string, name: string) =>
    api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`),

  readme: (owner: string, name: string) =>
    api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`),
};