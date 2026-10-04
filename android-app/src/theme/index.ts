import { useColorScheme } from 'react-native';

export const theme = {
  light: {
    bg: '#f7f6f4',
    surface: '#ffffff',
    surface2: '#f0efec',
    text: '#171716',
    muted: '#6b6864',
    border: '#e5e2dd',
    accent: '#1f6feb',
    accentSoft: '#dbeafe',
    danger: '#d1242f',
    star: '#e3b341',
  },
  dark: {
    bg: '#0d0d0d',
    surface: '#181818',
    surface2: '#232323',
    text: '#f3f2f0',
    muted: '#9c9a95',
    border: '#2b2b2b',
    accent: '#58a6ff',
    accentSoft: '#14263d',
    danger: '#f85149',
    star: '#e3b341',
  },
  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  sp: (n: number) => n * 4,
};

export const useTheme = () => {
  const isDark = useColorScheme() === 'dark';
  return { t: isDark ? theme.dark : theme.light, isDark };
};
