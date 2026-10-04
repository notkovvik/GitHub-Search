import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getRate, cacheClear } from '../api/github';
import { clearHistory } from '../storage/history';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthPanel from '../components/AuthPanel';

export default function SettingsScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [rate, setRate] = useState(getRate());
  const [cacheSize, setCacheSize] = useState(0);

  /** Открывает экран «Ссылки приложения» в настройках Android. */
  const openLinkSettings = useCallback(async () => {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.APP_OPEN_BY_DEFAULT_SETTINGS',
        { data: 'package:dev.notkovvik.ghexplorer' },
      );
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }, []);

  const refresh = useCallback(async () => {
    setRate(getRate());
    try {
      const keys = await AsyncStorage.getAllKeys();
      setCacheSize(keys.filter((k) => k.startsWith('gh_cache:')).length);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
    >
      <Text style={[s.title, { color: t.text }]}>Настройки</Text>

      <Text style={[s.groupTitle, { color: t.muted }]}>АККАУНТ</Text>
      <AuthPanel showSignOut />

      <Text style={[s.groupTitle, { color: t.muted, marginTop: 22 }]}>ССЫЛКИ GITHUB</Text>
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border, marginTop: 0 }]}>
        <Text style={{ color: t.muted, fontSize: 13.5, lineHeight: 19 }}>
          Начиная с Android 12 система открывает ссылки вида github.com/… в браузере, пока
          приложение не одобрено вручную. Включите github.com в разделе «Ссылки приложения» —
          и ссылки на репозитории будут открываться здесь.
        </Text>
        <Pressable
          onPress={openLinkSettings}
          android_ripple={{ color: '#fff3' }}
          style={[s.linkBtn, { backgroundColor: t.text }]}
        >
          <Ionicons name="open-outline" size={17} color={t.bg} />
          <Text style={{ color: t.bg, fontWeight: '700', marginLeft: 8 }}>
            Открыть настройки ссылок
          </Text>
        </Pressable>
      </View>

      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[s.cardTitle, { color: t.text }]}>Лимит GitHub API</Text>
        <View style={s.rateRow}>
          <Text style={{ color: t.muted }}>Осталось</Text>
          <Text style={{ color: t.text, fontWeight: '700' }}>
            {rate ? `${rate.remaining} / ${rate.limit}` : '—'}
          </Text>
        </View>
        {rate && (
          <>
            <View style={[s.progress, { backgroundColor: t.surface2 }]}>
              <View style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, (rate.remaining / rate.limit) * 100))}%`,
                backgroundColor: t.accent,
                borderRadius: 4,
              }} />
            </View>
            <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>
              Сброс: {new Date(rate.reset * 1000).toLocaleTimeString('ru-RU')}
            </Text>
          </>
        )}
      </View>

      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[s.cardTitle, { color: t.text }]}>Данные</Text>
        <Row icon="albums-outline" label="Кэш API" value={`${cacheSize} записей`} t={t} />
        <Pressable
          onPress={async () => { await cacheClear(); refresh(); }}
          style={[s.row, { borderColor: t.border }]}
        >
          <Ionicons name="refresh-outline" size={18} color={t.accent} />
          <Text style={{ color: t.accent, fontWeight: '600', marginLeft: 10 }}>
            Очистить кэш
          </Text>
        </Pressable>
        <Pressable
          onPress={async () => { await clearHistory(); }}
          style={[s.row, { borderColor: t.border }]}
        >
          <Ionicons name="time-outline" size={18} color={t.accent} />
          <Text style={{ color: t.accent, fontWeight: '600', marginLeft: 10 }}>
            Очистить историю поиска
          </Text>
        </Pressable>
      </View>

      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center', marginTop: 20 }}>
        GitHub Search · 1.0.0
      </Text>
    </ScrollView>
  );
}

function Row({ icon, label, value, t }: any) {
  return (
    <View style={[s.row, { borderColor: t.border }]}>
      <Ionicons name={icon} size={18} color={t.muted} />
      <Text style={{ color: t.text, flex: 1, marginLeft: 10 }}>{label}</Text>
      <Text style={{ color: t.muted, fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginBottom: 6 },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14, marginTop: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progress: { height: 8, borderRadius: 4, overflow: 'hidden' },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, marginTop: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
