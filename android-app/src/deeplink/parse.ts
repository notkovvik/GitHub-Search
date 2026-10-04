export type DeepTarget =
  | { type: 'profile'; login: string; filterRepo?: string }
  | { type: 'repo'; owner: string; name: string }
  | { type: 'search'; q: string }
  | { type: 'favorites' }
  | { type: 'settings' }
  | null;

const RESERVED = new Set([
  'login', 'logout', 'join', 'settings', 'notifications', 'explore', 'marketplace',
  'pricing', 'features', 'topics', 'trending', 'collections', 'sponsors', 'about',
  'site', 'security', 'enterprise', 'apps', 'new',
]);

export function parseUrl(raw: string): DeepTarget {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch { return null; }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const host = url.hostname.toLowerCase();

  if (scheme === 'ghexplorer') {
    // В URL со своим scheme первый сегмент попадает в hostname, а не в pathname:
    // ghexplorer://settings  -> hostname='settings'
    // ghexplorer://owner/repo -> hostname='owner', pathname='/repo'
    const parts = [url.hostname, ...url.pathname.split('/')].filter(Boolean);
    if (!parts.length) return null;

    const q = url.searchParams.get('q');
    if (parts[0] === 'auth') return null; // OAuth-редирект обрабатывает AuthContext
    if (parts[0] === 'search') return q ? { type: 'search', q } : null;
    if (parts[0] === 'favorites') return { type: 'favorites' };
    if (parts[0] === 'settings') return { type: 'settings' };
    if (parts.length >= 2) {
      return { type: 'repo', owner: parts[0], name: parts[1].replace(/\.git$/, '') };
    }
    return { type: 'profile', login: parts[0] };
  }

  if (host !== 'github.com' && host !== 'www.github.com') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  if (RESERVED.has(parts[0].toLowerCase())) return null;

  const owner = parts[0];
  const repo = parts[1];
  const TAB = url.searchParams.get('tab');

  if (repo && !['tab', 'repositories'].includes(repo.toLowerCase())) {
    return { type: 'repo', owner, name: repo.replace(/\.git$/, '') };
  }
  if (TAB === 'repositories') return { type: 'profile', login: owner };
  return { type: 'profile', login: owner };
}