/** Общие параметры OAuth-приложения GitHub (одно место для обоих потоков входа). */

export const CLIENT_ID = 'Ov23li6tMGNCeKexOEyH';
export const SCOPES = 'read:user user:email repo';
export const TOKEN_KEY = 'gh_token_v1';

/**
 * Callback для web-flow. Должен быть ровно таким же в настройках OAuth App
 * (Settings → Developer settings → OAuth Apps → Callback URL).
 * Схема ghexplorer объявлена в app.json, intent-filter собирается prebuild'ом.
 */
export const REDIRECT_URI = 'ghexplorer://auth';

/**
 * Секрет нужен, потому что GitHub требует его при обмене кода даже с PKCE
 * (проверено: запрос без секрета отвечает incorrect_client_credentials).
 * Берётся из .env (EXPO_PUBLIC_GH_CLIENT_SECRET) — файл в .gitignore.
 */
export const CLIENT_SECRET = (process.env.EXPO_PUBLIC_GH_CLIENT_SECRET || '').trim();

/** Web-flow доступен только когда секрет задан; иначе остаёмся на device-flow. */
export const hasWebFlow = () => CLIENT_SECRET.length > 0;
