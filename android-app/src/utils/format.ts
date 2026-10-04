export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

export function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d',
  'C#': '#178600', C: '#555555', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Shell: '#89e051', Vue: '#41b883', Svelte: '#ff3e00', Dart: '#00B4AB',
  Lua: '#000080', Perl: '#0298c3', Scala: '#c22d40', Elixir: '#6e4a7e',
  Haskell: '#5e5086', R: '#198CE7', Julia: '#a270ba',
  'Jupyter Notebook': '#DA5B0B', Dockerfile: '#384d54', Makefile: '#427819',
};

export const langColor = (l?: string | null) => (l && LANG_COLORS[l]) || '#8b8b8b';

export function parseRepoRef(input: string): { owner: string; repo: string } | null {
  const s = input.trim();
  let m = s.match(/^https?:\/\/(?:www\.)?github\.com\/([^\/\s?#]+)\/([^\/\s?#]+)/i);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  m = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

export const looksLikeLogin = (s: string) =>
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(s);
