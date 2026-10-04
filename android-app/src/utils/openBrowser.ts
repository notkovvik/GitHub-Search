import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';

/**
 * Компоненты популярных браузеров.
 *
 * Указывать нужно И пакет, И класс: expo-intent-launcher использует packageName
 * только вместе с className (см. IntentLauncherModule.kt), иначе параметр
 * игнорируется и уходит обычный ACTION_VIEW. А обычный ACTION_VIEW система
 * возвращает в это же приложение, потому что мы одобрены как обработчик
 * github.com — именно поэтому раньше браузер не открывался вовсе.
 */
const BROWSERS: { pkg: string; cls: string }[] = [
  { pkg: 'com.android.chrome', cls: 'com.google.android.apps.chrome.Main' },
  { pkg: 'com.android.browser', cls: 'com.android.browser.BrowserActivity' },
  { pkg: 'org.mozilla.firefox', cls: 'org.mozilla.firefox.App' },
  { pkg: 'com.brave.browser', cls: 'com.google.android.apps.chrome.Main' },
  { pkg: 'com.microsoft.emmx', cls: 'com.microsoft.ruby.Main' },
  { pkg: 'com.opera.browser', cls: 'com.opera.Opera' },
  { pkg: 'com.sec.android.app.sbrowser', cls: 'com.sec.android.app.sbrowser.SBrowserMainActivity' },
  { pkg: 'com.vivo.browser', cls: 'com.vivo.browser.BrowserActivity' },
  { pkg: 'ru.yandex.searchplugin', cls: 'ru.yandex.searchplugin.MainActivity' },
];

const LAUNCH_TIMEOUT = 1500;

/**
 * Открывает страницу GitHub во внешнем браузере.
 * Не блокирует вызывающий код: сам запуск происходит сразу, а промис модуля
 * завершается только когда пользователь вернётся в приложение.
 */
export function openInBrowser(url: string): void {
  void (async () => {
    for (const { pkg, cls } of BROWSERS) {
      try {
        await Promise.race([
          IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: url,
            packageName: pkg,
            className: cls,
          }),
          new Promise((resolve) => setTimeout(resolve, LAUNCH_TIMEOUT)),
        ]);
        console.log('[browser] opened in', pkg);
        return;
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes('already started')) {
          console.log('[browser] already launching');
          return;
        }
        console.log('[browser] failed', pkg, msg);
      }
    }
    console.log('[browser] fallback to system');
    WebBrowser.openBrowserAsync(url, {
      createTask: true,
      showTitle: true,
      toolbarColor: '#0d0d0d',
      dismissButtonStyle: 'close',
    }).catch(() => {});
  })();
}
