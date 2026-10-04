import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { parseUrl, DeepTarget } from './parse';

/**
 * Отдаёт наружу и разобранную цель, и исходный URL — второй нужен, чтобы
 * необработанные ссылки (например, github.com/notifications) можно было
 * передать браузеру.
 */
export function useDeepLinks(onTarget: (t: DeepTarget, raw: string) => void) {
  const ref = useRef(onTarget);
  ref.current = onTarget;
  const last = useRef<{ url: string; at: number } | null>(null);

  useEffect(() => {
    let alive = true;

    // Android при холодном старте отдаёт ссылку и через getInitialURL, и событием
    // 'url' — без этой защиты обработка запускалась дважды (двойная навигация,
    // а вызовы браузера отклонялись с «IntentLauncher activity is already started»).
    const handle = (url?: string | null) => {
      if (!url) return;
      const now = Date.now();
      if (last.current && last.current.url === url && now - last.current.at < 3000) return;
      last.current = { url, at: now };
      ref.current(parseUrl(url), url);
    };

    (async () => {
      const initial = await Linking.getInitialURL();
      if (!alive) return;
      // небольшая задержка, чтобы навигация успела подняться
      setTimeout(() => { if (alive) handle(initial); }, 80);
    })();

    const sub = Linking.addEventListener('url', (e) => handle(e.url));

    return () => { alive = false; sub.remove(); };
  }, []);
}
