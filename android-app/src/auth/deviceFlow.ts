import * as SecureStore from 'expo-secure-store';
import { CLIENT_ID, SCOPES, TOKEN_KEY } from './config';

// Зарегистрируй OAuth App: https://github.com/settings/developers
// Enable "Device flow" в настройках приложения. client_secret для Device Flow НЕ нужен.

export type DeviceCode = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  /** GitHub может вернуть готовую ссылку с уже подставленным кодом. */
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
};

/** Ссылка на страницу ввода кода: по возможности с кодом, подставленным заранее. */
export function verificationUrl(d: DeviceCode): string {
  if (d.verification_uri_complete) return d.verification_uri_complete;
  const sep = d.verification_uri.includes('?') ? '&' : '?';
  return `${d.verification_uri}${sep}user_code=${encodeURIComponent(d.user_code)}`;
}

export async function startDeviceFlow(): Promise<DeviceCode> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPES }),
  });
  if (!res.ok) throw new Error('device_code_failed');
  return res.json();
}

export async function pollForToken(
  device: DeviceCode,
  onTick?: (secLeft: number) => void,
  isCancelled?: () => boolean,
): Promise<string> {
  const deadline = Date.now() + device.expires_in * 1000;
  let interval = Math.max(device.interval, 5) * 1000;

  while (Date.now() < deadline) {
    if (isCancelled?.()) throw new Error('cancelled');
    if (onTick) onTick(Math.max(0, Math.round((deadline - Date.now()) / 1000)));

    // спим дробно, чтобы отмена срабатывала мгновенно
    const until = Date.now() + interval;
    while (Date.now() < until) {
      if (isCancelled?.()) throw new Error('cancelled');
      await new Promise((r) => setTimeout(r, Math.min(400, until - Date.now())));
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: device.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await res.json();

    if (data.access_token) {
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      return data.access_token;
    }
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') { interval += 5000; continue; }
    if (data.error === 'expired_token') throw new Error('expired');
    if (data.error === 'access_denied') throw new Error('denied');
    throw new Error(data.error || 'poll_failed');
  }
  throw new Error('expired');
}

export const getStoredToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const signOut = () => SecureStore.deleteItemAsync(TOKEN_KEY);