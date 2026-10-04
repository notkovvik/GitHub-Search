import React from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/ref';
import { useDeepLinks } from './src/deeplink/useDeepLinks';
import { DeepTarget } from './src/deeplink/parse';
import { openInBrowser } from './src/utils/openBrowser';

const GITHUB_WEB = /^https?:\/\/(?:www\.)?github\.com\//i;

function navigateTo(target: DeepTarget, raw: string) {
  // Ссылка github.com, которую приложение не умеет разобрать (не репозиторий и
  // не профиль) — отправляем в браузер, а не оставляем пользователя в пустом экране.
  if (!target) {
    console.log('[deeplink] unresolved', raw);
    if (GITHUB_WEB.test(raw)) openInBrowser(raw);
    return;
  }
  if (!navigationRef.isReady()) return;
  switch (target.type) {
    case 'profile':
      navigationRef.navigate('Profile', { login: target.login, filterRepo: target.filterRepo });
      break;
    case 'repo':
      navigationRef.navigate('Repo', { owner: target.owner, name: target.name });
      break;
    case 'search':
      navigationRef.navigate('Tabs', { screen: 'Search', params: { q: target.q } });
      break;
    case 'favorites':
      navigationRef.navigate('Tabs', { screen: 'Favorites' });
      break;
    case 'settings':
      navigationRef.navigate('Tabs', { screen: 'Settings' });
      break;
  }
}

function DeepLinkBridge() {
  useDeepLinks(navigateTo);
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
        <DeepLinkBridge />
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// package.json -> "main": "App.tsx", поэтому компонент 'main' (его ждёт
// MainActivity.getMainComponentName()) обязан зарегистрировать сам App.tsx.
registerRootComponent(App);