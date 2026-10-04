import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { parseRepoRef, looksLikeLogin } from '../utils/format';
import Chip from '../components/Chip';
import AuthPanel from '../components/AuthPanel';

const QUICK = ['notkovvik', 'torvalds', 'sindresorhus', 'gaearon'];

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  const submit = useCallback(() => {
    Keyboard.dismiss();
    const v = q.trim();
    if (!v) return;
    const ref = parseRepoRef(v);
    if (ref) { nav.navigate('Profile', { login: ref.owner, filterRepo: ref.repo }); return; }
    const clean = v.replace(/^@/, '');
    if (looksLikeLogin(clean)) nav.navigate('Profile', { login: clean });
    else nav.navigate('Tabs', { screen: 'Search', params: { q: clean } });
  }, [q, nav]);

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={[s.wrap, { paddingTop: insets.top + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInDown.duration(260)}>
        <Text style={[s.eyebrow, { color: t.accent }]}>GITHUB SEARCH</Text>
        <Text style={[s.title, { color: t.text }]}>
          Найдите <Text style={{ color: t.accent }}>проекты</Text>{'\n'}любого пользователя
        </Text>
        <Text style={[s.sub, { color: t.muted }]}>
          Введите ник, ссылку на репозиторий или поисковый запрос.
        </Text>

        <View style={[s.searchRow, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="search" size={20} color={t.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder="torvalds, github.com/user/repo…"
            placeholderTextColor={t.muted}
            style={[s.input, { color: t.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable onPress={submit} style={[s.go, { backgroundColor: t.accent }]}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={s.chips}>
          {QUICK.map((u) => (
            <Chip key={u} label={u} onPress={() => nav.navigate('Profile', { login: u })} />
          ))}
        </View>

        <AuthPanel />
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1, lineHeight: 42, marginBottom: 12 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 22 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 56, gap: 10,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  go: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
});
