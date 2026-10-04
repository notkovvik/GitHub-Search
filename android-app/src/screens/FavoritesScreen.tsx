import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadFavs, subscribeFavs, FavRepo, FavUser } from '../storage/favorites';
import { useTheme } from '../theme';
import RepoCard from '../components/RepoCard';
import UserCard from '../components/UserCard';
import Segmented from '../components/Segmented';
import EmptyState from '../components/EmptyState';

export default function FavoritesScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'repos' | 'users'>('repos');
  const [repos, setRepos] = useState<FavRepo[]>([]);
  const [users, setUsers] = useState<FavUser[]>([]);

  const refresh = useCallback(async () => {
    const s = await loadFavs();
    setRepos([...s.repos]); setUsers([...s.users]);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeFavs(refresh);
  }, [refresh]);

  const data = tab === 'repos' ? repos : users;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.header, { borderBottomColor: t.border, paddingTop: insets.top + 14 }]}>
        <Text style={[s.title, { color: t.text }]}>Избранное</Text>
        <Segmented<'repos' | 'users'>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'repos', label: `Репозитории · ${repos.length}` },
            { value: 'users', label: `Авторы · ${users.length}` },
          ]}
        />
      </View>

      {data.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Пусто"
          hint={tab === 'repos' ? 'Сохраняйте репозитории кнопкой закладки' : 'Сохраняйте авторов кнопкой закладки'}
        />
      ) : (
        <FlashList
          data={data as any[]}
          keyExtractor={(it: any) => tab === 'repos' ? String(it.id) : it.login}
          estimatedItemSize={130}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            if (tab === 'repos') {
              const r = item as FavRepo;
              return (
                <RepoCard
                  repo={{
                    id: r.id,
                    name: r.name,
                    owner: { login: r.owner },
                    description: r.description ?? null,
                    language: r.language ?? null,
                    stargazers_count: r.stars,
                    pushed_at: new Date().toISOString(),
                    html_url: r.url,
                  }}
                  showOwner
                  onPress={() => nav.navigate('Repo', { owner: r.owner, name: r.name })}
                />
              );
            }
            const u = item as FavUser;
            return (
              <UserCard
                user={{ login: u.login, avatar_url: u.avatar_url, name: u.name }}
                onPress={() => nav.navigate('Profile', { login: u.login })}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 14 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
});
