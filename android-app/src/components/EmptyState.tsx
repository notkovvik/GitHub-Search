import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function EmptyState({
  icon = 'search-outline', title, hint, actionLabel, onAction,
}: {
  icon?: any;
  title: string;
  hint?: string;
  /** Необязательная кнопка — например «Войти через GitHub» при исчерпанном лимите. */
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={s.wrap}>
      <Ionicons name={icon} size={48} color={t.muted} />
      <Text style={[s.title, { color: t.text }]}>{title}</Text>
      {!!hint && <Text style={[s.hint, { color: t.muted }]}>{hint}</Text>}
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          android_ripple={{ color: '#fff3' }}
          style={[s.btn, { backgroundColor: t.text }]}
        >
          <Ionicons name="logo-github" size={17} color={t.bg} />
          <Text style={{ color: t.bg, fontWeight: '700', marginLeft: 8 }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 8,
  },
});
