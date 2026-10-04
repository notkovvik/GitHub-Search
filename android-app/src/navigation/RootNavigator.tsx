import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import {
  NavigationContainer, DarkTheme, DefaultTheme, useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { navigationRef } from './ref';
import { useTheme } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RepoScreen from '../screens/RepoScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/** Плавное появление экрана при выборе вкладки (лёгкий подъём + проявление). */
function withTabAnimation<P extends object>(Screen: React.ComponentType<P>) {
  function AnimatedTab(props: P) {
    const isFocused = useIsFocused();
    const anim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (!isFocused) return;
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [isFocused, anim]);

    return (
      <Animated.View
        style={[
          styles.scene,
          {
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          },
        ]}
      >
        <Screen {...props} />
      </Animated.View>
    );
  }
  return AnimatedTab;
}

const AnimatedHome = withTabAnimation(HomeScreen);
const AnimatedSearch = withTabAnimation(SearchScreen);
const AnimatedFavorites = withTabAnimation(FavoritesScreen);
const AnimatedSettings = withTabAnimation(SettingsScreen);

function Tabs() {
  const { t } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Search: ['search', 'search-outline'],
            Favorites: ['bookmark', 'bookmark-outline'],
            Settings: ['settings', 'settings-outline'],
          };
          const [on, off] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={AnimatedHome} options={{ title: 'Главная' }} />
      <Tab.Screen name="Search" component={AnimatedSearch} options={{ title: 'Поиск' }} />
      <Tab.Screen name="Favorites" component={AnimatedFavorites} options={{ title: 'Избранное' }} />
      <Tab.Screen name="Settings" component={AnimatedSettings} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { t, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const nav = {
    ...base,
    colors: { ...base.colors, background: t.bg },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={nav}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Repo" component={RepoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
});
