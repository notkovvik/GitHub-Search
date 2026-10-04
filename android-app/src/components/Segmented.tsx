import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { t } = useTheme();
  return (
    <View style={[s.wrap, { backgroundColor: t.surface, borderColor: t.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            android_ripple={{ color: t.surface2 }}
            style={[s.item, active && { backgroundColor: t.surface2 }]}
          >
            <Text style={{
              color: active ? t.text : t.muted,
              fontWeight: '700',
              fontSize: 13,
            }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
});