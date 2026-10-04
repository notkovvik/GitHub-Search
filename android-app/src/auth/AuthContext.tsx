import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  startDeviceFlow, pollForToken, getStoredToken, signOut as wipeToken,
  verificationUrl, DeviceCode,
} from './deviceFlow';
import { TOKEN_KEY, hasWebFlow } from './config';
import { buildAuthorizeUrl, exchangeCode, parseRedirect } from './webFlow';
import { challengeFromVerifier, createState, createVerifier } from './pkce';
import { openInBrowser } from '../utils/openBrowser';

export type GhUser = { login: string; avatar_url: string; name?: string; html_url?: string };

type AuthValue = {
  token: string | null;
  user: GhUser | null;
  loading: boolean;
  device: DeviceCode | null;
  secondsLeft: number;
  error: string | null;
  /** Код только что скопирован в буфер — для галочки в UI. */
  copied: boolean;
  /** Вход в процессе (ждём подтверждения). */
  awaiting: boolean;
  /** Какой поток используется: web (в один тап) или device (с кодом). */
  method: 'web' | 'device';
  verification: string | null;
  beginLogin: () => Promise<void>;
  cancelLogin: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  copyCode: () => Promise<void>;
  openVerification: () => void;
};

const Ctx = createContext<AuthValue>({} as AuthValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GhUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<DeviceCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [webPending, setWebPending] = useState(false);

  const cancelRef = useRef(false);
  const busyRef = useRef(false);
  const deviceRef = useRef<DeviceCode | null>(null);
  const pendingRef = useRef<{ state: string; verifier: string } | null>(null);
  const authUrlRef = useRef<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  deviceRef.current = device;

  const loadUser = useCallback(async (tk: string) => {
    try {
      const r = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tk}`, Accept: 'application/vnd.github+json' },
      });
      if (r.ok) setUser(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const tk = await getStoredToken();
      if (tk) { setToken(tk); await loadUser(tk); }
      setLoading(false);
    })();
  }, [loadUser]);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const flashCopied = useCallback(() => {
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2500);
  }, []);

  // ---------- device flow: код в буфере + страница GitHub поверх приложения ----------

  const copyCode = useCallback(async () => {
    const code = deviceRef.current?.user_code;
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      flashCopied();
    } catch {}
  }, [flashCopied]);

  const openUrl = useCallback((d: DeviceCode | null | undefined) => {
    if (!d) return;
    openInBrowser(verificationUrl(d));
  }, []);

  const openVerification = useCallback(() => {
    if (authUrlRef.current) {
      openInBrowser(authUrlRef.current);
      return;
    }
    openUrl(deviceRef.current);
  }, [openUrl]);

  // ---------- web flow: возврат по ghexplorer://auth?code=… ----------

  const finishWebLogin = useCallback(async (url: string) => {
    const r = parseRedirect(url);
    if (!r) return;
    try { WebBrowser.dismissBrowser(); } catch {}

    if (r.error) {
      pendingRef.current = null;
      setWebPending(false);
      setError(r.error === 'access_denied' ? 'Доступ отклонён на GitHub' : r.error);
      return;
    }
    const p = pendingRef.current;
    if (!r.code || !p || r.state !== p.state) return; // чужой или устаревший редирект
    pendingRef.current = null;
    try {
      const tk = await exchangeCode(r.code, p.verifier);
      await SecureStore.setItemAsync(TOKEN_KEY, tk);
      setToken(tk);
      await loadUser(tk);
    } catch (e: any) {
      const raw = String(e?.message || '');
      if (/redirect_uri/i.test(raw)) {
        setError('Добавьте Callback URL ghexplorer://auth в настройках OAuth App на GitHub');
      } else if (/incorrect_client_credentials/i.test(raw)) {
        setError('Проверьте EXPO_PUBLIC_GH_CLIENT_SECRET в файле .env');
      } else {
        setError(raw || 'Не удалось получить токен');
      }
    } finally {
      setWebPending(false);
    }
  }, [loadUser]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => { finishWebLogin(url); });
    Linking.getInitialURL()
      .then((u) => { if (u) finishWebLogin(u); })
      .catch(() => {});
    return () => sub.remove();
  }, [finishWebLogin]);

  // ---------- запуск входа ----------

  const beginLogin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    cancelRef.current = false;

    if (hasWebFlow()) {
      try {
        const verifier = createVerifier();
        const challenge = await challengeFromVerifier(verifier);
        const state = createState();
        pendingRef.current = { state, verifier };
        setWebPending(true);
        const url = buildAuthorizeUrl(state, challenge);
        authUrlRef.current = url;
        openInBrowser(url);
      } catch {
        setError('Не удалось открыть страницу GitHub');
        setWebPending(false);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return;
    }

    // Фолбэк: device flow, если client secret ещё не задан в .env
    try {
      const d = await startDeviceFlow();
      setDevice(d);
      try { await Clipboard.setStringAsync(d.user_code); flashCopied(); } catch {}
      openUrl(d);
      const tk = await pollForToken(d, setSecondsLeft, () => cancelRef.current);
      if (cancelRef.current) return;
      setToken(tk);
      await loadUser(tk);
    } catch (e: any) {
      if (!cancelRef.current) {
        if (e?.message === 'expired') setError('Код истёк — попробуйте ещё раз');
        else if (e?.message === 'denied') setError('Доступ отклонён на GitHub');
        else setError(e?.message || 'Не удалось войти');
      }
    } finally {
      setDevice(null);
      setSecondsLeft(0);
      busyRef.current = false;
      setBusy(false);
    }
  }, [loadUser, openUrl, flashCopied]);

  const cancelLogin = useCallback(() => {
    cancelRef.current = true;
    deviceRef.current = null;
    pendingRef.current = null;
    authUrlRef.current = null;
    setDevice(null);
    setSecondsLeft(0);
    setWebPending(false);
  }, []);

  const signOut = useCallback(async () => {
    cancelRef.current = true;
    pendingRef.current = null;
    authUrlRef.current = null;
    await wipeToken();
    setToken(null);
    setUser(null);
    setError(null);
    setWebPending(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) await loadUser(token);
  }, [token, loadUser]);

  return (
    <Ctx.Provider value={{
      token, user, loading, device, secondsLeft, error, copied,
      awaiting: !!device || busy || webPending,
      method: hasWebFlow() ? 'web' : 'device',
      verification: device ? verificationUrl(device) : null,
      beginLogin, cancelLogin, signOut, refreshUser, copyCode, openVerification,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
