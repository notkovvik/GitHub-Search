import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gh, ApiError } from '../api/github';
import { useTheme } from '../theme';
import RepoCard from '../components/RepoCard';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';

type Sort = 'updated' | 'stars' | 'created' | 'name-asc';

export default function ProfileScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const login: string = route.params?.login;
  const filterRepo: string | undefined = route.params?.filterRepo;

  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState(filterRepo ?? '');
  const [sort, setSort] = useState<Sort>('updated');
  const [tab, setTab] = useState<'repos' | 'about'>('repos');
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const [u, r] = await Promise.all([gh.user(login), gh.repos(login)]);
        if (!alive) return;
        setProfile(u); setRepos(r);
      } catch (e: any) {
        if (e instanceof ApiError && e.code === 'NOT_FOUND') setErr('Пользователь не найден');
        else if (e instanceof ApiError && e.code === 'RATE_LIMIT') { setRateLimited(true); setErr('Лимит GitHub исчерпан'); }
        else setErr('Ошибка сети');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [login]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? repos.filter((r) => {
          const hay = [r.name, r.description, r.language, ...(r.topics ?? [])]
            .filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : repos.slice();

    const sorters: Record<Sort, (a: any, b: any) => number> = {
      updated: (a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at),
      created: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      stars: (a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0),
      'name-asc': (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[sort]);
  }, [repos, query, sort]);

  const stats = useMemo(() => {
    const stars = repos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
    const langs = new Set(repos.map((r) => r.language).filter(Boolean));
    return { repos: repos.length, stars, langs: langs.size };
  }, [repos]);

  // Шапка в потоке: кнопка «назад» не перекрывает контент
  const TopBar = (
    <View style={[s.topbar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => nav.goBack()}
        hitSlop={12}
        android_ripple={{ color: t.surface2, borderless: true, radius: 22 }}
        style={[s.back, { backgroundColor: t.surface, borderColor: t.border }]}
      >
        <Ionicons name="chevron-back" size={22} color={t.text} />
      </Pressable>
      <Text numberOfLines={1} style={{ color: t.text, flex: 1, fontSize: 15, fontWeight: '700' }}>
        @{login}
      </Text>
    </View>
  );

  const Header = (
    <View>
      {loading || !profile ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <View style={s.profile}>
          <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          <Text style={[s.name, { color: t.text }]}>{profile.name || profile.login}</Text>
          <Text style={[s.login, { color: t.muted }]}>@{profile.login}</Text>
          {!!profile.bio && (
            <Text style={[s.bio, { color: t.muted }]} numberOfLines={3}>{profile.bio}</Text>
          )}
          <View style={s.badges}>
            {profile.location && <Badge icon="location-outline" label={profile.location} t={t} />}
            {profile.company && <Badge icon="business-outline" label={profile.company} t={t} />}
            <Badge icon="people-outline" label={`${profile.followers ?? 0} подписчиков`} t={t} />
          </View>

          <View style={s.stats}>
            <Stat value={stats.repos} label="Проектов" t={t} />
            <Stat value={stats.stars} label="Звёзд" t={t} />
            <Stat value={stats.langs} label="Языков" t={t} />
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Segmented<'repos' | 'about'>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'repos', label: 'Репозитории' },
            { value: 'about', label: 'О пользователе' },
          ]}
        />

        {tab === 'repos' && (
          <>
            <View style={[s.searchBox, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Ionicons name="search" size={16} color={t.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Фильтр по названию, языку, теме…"
                placeholderTextColor={t.muted}
                style={[s.input, { color: t.text }]}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color={t.muted} />
                </Pressable>
              )}
            </View>

            <View style={s.sortRow}>
              {(['updated', 'stars', 'created', 'name-asc'] as Sort[]).map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setSort(x)}
                  style={[s.sortChip, {
                    backgroundColor: sort === x ? t.accentSoft : t.surface,
                    borderColor: sort === x ? t.accent : t.border,
                  }]}
                >
                  <Text style={{
                    color: sort === x ? t.accent : t.muted,
                    fontSize: 12, fontWeight: '700',
                  }}>
                    {{ updated: 'Обновление', stars: 'Звёзды', created: 'Новые', 'name-asc': 'A→Z' }[x]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: t.muted, fontSize: 12.5 }}>
              {filtered.length} из {repos.length}
            </Text>
          </>
        )}
      </View>
    </View>
  );

  if (err) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {TopBar}
        <EmptyState
          icon="alert-circle-outline"
          title={err}
          hint={rateLimited ? 'Без входа лимит — 60 запросов в час, после входа — 5000.' : undefined}
          actionLabel={rateLimited ? 'Войти через GitHub' : undefined}
          onAction={rateLimited ? () => nav.navigate('Tabs', { screen: 'Settings' }) : undefined}
        />
      </View>
    );
  }

  if (tab === 'about' && profile) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {TopBar}
        <View style={{ padding: 20, gap: 12 }}>
          <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          <Text style={[s.name, { color: t.text }]}>{profile.name || profile.login}</Text>
          <Text style={[s.login, { color: t.muted }]}>@{profile.login}</Text>
          {!!profile.bio && <Text style={[s.bio, { color: t.text }]}>{profile.bio}</Text>}
          <View style={{ gap: 8, marginTop: 16 }}>
            {profile.blog && <Row icon="link-outline" label={profile.blog} t={t} />}
            {profile.twitter_username && <Row icon="logo-twitter" label={'@' + profile.twitter_username} t={t} />}
            {profile.company && <Row icon="business-outline" label={profile.company} t={t} />}
            <Row icon="calendar-outline" label={'На GitHub с ' + new Date(profile.created_at).toLocaleDateString('ru-RU')} t={t} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {TopBar}
      <FlashList
        data={filtered}
        keyExtractor={(it: any) => String(it.id)}
        estimatedItemSize={140}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <RepoCard
              repo={item}
              onPress={() => nav.navigate('Repo', { owner: item.owner.login, name: item.name })}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="folder-open-outline" title="Проекты не найдены" />
          )
        }
      />
    </View>
  );
}

function Stat({ value, label, t }: any) {
  return (
    <View style={[s.stat, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[s.statVal, { color: t.text }]}>{value}</Text>
      <Text style={[s.statLbl, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

function Badge({ icon, label, t }: any) {
  return (
    <View style={[s.badge, { backgroundColor: t.surface2 }]}>
      <Ionicons name={icon} size={12} color={t.muted} />
      <Text style={{ color: t.muted, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, t }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={16} color={t.muted} />
      <Text style={{ color: t.text, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  back: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  profile: { paddingTop: 4, paddingHorizontal: 20, alignItems: 'flex-start', gap: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#333' },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 12 },
  login: { fontSize: 14, fontWeight: '600' },
  bio: { fontSize: 14.5, lineHeight: 20, marginTop: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 3 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontSize: 14, paddingVertical: 0 },
  sortRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
