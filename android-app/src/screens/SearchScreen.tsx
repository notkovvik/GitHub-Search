import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, ScrollView,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { gh, ApiError } from '../api/github';
import { useTheme } from '../theme';
import RepoCard from '../components/RepoCard';
import UserCard from '../components/UserCard';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import Segmented from '../components/Segmented';
import { pushHistory } from '../storage/history';

type Tab = 'repos' | 'users';
const DEBOUNCE_MS = 420;

export default function SearchScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView | null>(null);

  const [q, setQ] = useState<string>(route.params?.q ?? '');
  const [tab, setTab] = useState<Tab>('repos');
  const [users, setUsers] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [reposTotal, setReposTotal] = useState(0);
  const [pageU, setPageU] = useState(1);
  const [pageR, setPageR] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  // порядковый номер запроса: ответы устаревших поисков игнорируются
  const reqId = useRef(0);

  const runSearch = useCallback(async (query: string, remember = false) => {
    const v = query.trim();
    if (!v) return;
    const id = ++reqId.current;
    setLoading(true);
    setErr(null);
    if (remember) pushHistory(v);
    try {
      const [u, r] = await Promise.all([gh.searchUsers(v, 1), gh.searchRepos(v, 1)]);
      if (id !== reqId.current) return;
      setUsers(u?.items ?? []);
      setUsersTotal(u?.total_count ?? 0);
      setRepos(r?.items ?? []);
      setReposTotal(r?.total_count ?? 0);
      setPageU(1);
      setPageR(1);
      setRateLimited(false);
      setTouched(true);
    } catch (e: any) {
      if (id !== reqId.current) return;
      const limited = e instanceof ApiError && e.code === 'RATE_LIMIT';
      setRateLimited(limited);
      setTouched(true);
      setErr(
        limited
          ? 'Достигнут лимит GitHub'
          : 'Не удалось загрузить данные',
      );
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Живой поиск: Enter не нужен. Минимум 2 символа — иначе анонимный
  // лимит поиска GitHub (10 запросов в минуту) выгорает на первой же букве.
  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) {
      reqId.current++;
      setLoading(false);
      setTouched(false);
      setErr(null);
      setRateLimited(false);
      setUsers([]); setRepos([]);
      setUsersTotal(0); setReposTotal(0);
      return;
    }
    const id = setTimeout(() => runSearch(v), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q, runSearch]);

  // Переход по ссылке из главного экрана / диплинка
  useEffect(() => {
    if (route.params?.q) {
      setQ(route.params.q);
      runSearch(route.params.q, true);
    }
  }, [route.params?.q, runSearch]);

  const goTab = useCallback((next: Tab) => {
    setTab(next);
    pager.current?.scrollTo({ x: next === 'users' ? width : 0, animated: true });
  }, [width]);

  const onPagerEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next: Tab = x > width / 2 ? 'users' : 'repos';
    setTab((prev) => (prev === next ? prev : next));
  }, [width]);

  const loadMore = async () => {
    if (loadingMore || loading || !q.trim()) return;
    if (tab === 'users' && users.length >= usersTotal) return;
    if (tab === 'repos' && repos.length >= reposTotal) return;
    setLoadingMore(true);
    try {
      if (tab === 'users') {
        const next = pageU + 1;
        const r = await gh.searchUsers(q.trim(), next);
        setUsers((p) => [...p, ...(r?.items ?? [])]);
        setPageU(next);
      } else {
        const next = pageR + 1;
        const r = await gh.searchRepos(q.trim(), next);
        setRepos((p) => [...p, ...(r?.items ?? [])]);
        setPageR(next);
      }
    } catch {
      // тихо: следующая попытка при скролле
    } finally {
      setLoadingMore(false);
    }
  };

  const hasResults = repos.length > 0 || users.length > 0;

  const renderPane = (kind: Tab) => {
    const data = kind === 'users' ? users : repos;
    if (loading && !hasResults) {
      return (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    if (err) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={err}
          hint={rateLimited
            ? 'Без входа GitHub даёт 60 запросов в час, а на поиск — 10 в минуту. После входа — 5000 в час.'
            : 'Попробуйте снова'}
          actionLabel={rateLimited ? 'Войти через GitHub' : undefined}
          onAction={rateLimited ? () => nav.navigate('Tabs', { screen: 'Settings' }) : undefined}
        />
      );
    }
    if (!touched) {
      return (
        <EmptyState
          icon="search-outline"
          title={kind === 'users' ? 'Поиск авторов' : 'Поиск репозиториев'}
          hint="Печатайте — поиск идёт сам, Enter не нужен. Можно листать свайпом влево/вправо."
        />
      );
    }
    if (data.length === 0) {
      return (
        <EmptyState
          icon="sad-outline"
          title={kind === 'users' ? 'Авторы не найдены' : 'Репозитории не найдены'}
          hint="Попробуйте другой запрос"
        />
      );
    }
    return (
      <FlashList
        data={data}
        keyExtractor={(it: any) => String(it.id)}
        estimatedItemSize={140}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={t.accent} /> : null
        }
        renderItem={({ item }) =>
          kind === 'users' ? (
            <UserCard user={item} onPress={() => nav.navigate('Profile', { login: item.login })} />
          ) : (
            <RepoCard
              repo={item}
              showOwner
              onPress={() => nav.navigate('Repo', { owner: item.owner.login, name: item.name })}
            />
          )
        }
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 14, borderBottomColor: t.border }]}>
        <View style={[s.searchBox, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="search" size={18} color={t.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => runSearch(q, true)}
            returnKeyType="search"
            placeholder="Поиск авторов и репозиториев…"
            placeholderTextColor={t.muted}
            style={[s.input, { color: t.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={t.accent} />}
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={t.muted} />
            </Pressable>
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          <Segmented<Tab>
            value={tab}
            onChange={goTab}
            options={[
              { value: 'repos', label: `Репозитории${reposTotal ? ` · ${reposTotal}` : ''}` },
              { value: 'users', label: `Авторы${usersTotal ? ` · ${usersTotal}` : ''}` },
            ]}
          />
        </View>
      </View>

      {/* Свайп между репозиториями и авторами — работает и при пустом запросе */}
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={onPagerEnd}
        style={{ flex: 1 }}
      >
        <View style={{ width }}>{renderPane('repos')}</View>
        <View style={{ width }}>{renderPane('users')}</View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
