import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPES } from './config';

/** OAuth web-flow GitHub с PKCE: один тап, без ввода кода. */

const qs = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export function buildAuthorizeUrl(state: string, challenge: string): string {
  return 'https://github.com/login/oauth/authorize?' + qs({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
}

/** Разбирает редирект ghexplorer://auth?code=…&state=… (или ?error=…). */
export function parseRedirect(url: string): { code?: string; state?: string; error?: string } | null {
  if (!url || !url.startsWith('ghexplorer://auth')) return null;
  const query = url.split('?')[1] || '';
  const out: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
    const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1));
    out[k] = v;
  }
  return { code: out.code, state: out.state, error: out.error };
}

export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: qs({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (data?.access_token) return data.access_token as string;
  throw new Error(data?.error_description || data?.error || 'token_exchange_failed');
}
