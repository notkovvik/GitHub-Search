import React, { useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { theme } from '../theme';

export function SkeletonCard() {
  const isDark = useColorScheme() === 'dark';
  const t = isDark ? theme.dark : theme.light;
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, []);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, anim]}>
      <View style={[s.line, { backgroundColor: t.surface2, width: '55%', height: 20 }]} />
      <View style={[s.line, { backgroundColor: t.surface2, width: '90%' }]} />
      <View style={[s.line, { backgroundColor: t.surface2, width: '70%' }]} />
      <View style={{ flex: 1 }} />
      <View style={[s.line, { backgroundColor: t.surface2, width: '40%' }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 16, marginBottom: 12, gap: 10, height: 160 },
  line: { height: 14, borderRadius: 6 },
});