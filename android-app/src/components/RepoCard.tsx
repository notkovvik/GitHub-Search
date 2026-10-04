import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { langColor, compactNumber, formatDate } from '../utils/format';
import { isRepoFav, toggleRepo, subscribeFavs } from '../storage/favorites';

type Repo = {
  id: number; name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
  archived?: boolean;
  fork?: boolean;
};

export default function RepoCard({
  repo, onPress, showOwner = false,
}: { repo: Repo; onPress: () => void; showOwner?: boolean }) {
  const { t } = useTheme();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    isRepoFav(repo.id).then((v) => mounted && setFav(v));
    const unsub = subscribeFavs(() => {
      isRepoFav(repo.id).then((v) => mounted && setFav(v));
    });
    return () => { mounted = false; unsub(); };
  }, [repo.id]);

  const onToggleFav = async () => {
    await toggleRepo({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      url: repo.html_url,
    });
  };

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.surface2 }}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: t.surface, borderColor: t.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          {showOwner && (
            <Text style={[s.owner, { color: t.muted }]} numberOfLines={1}>
              {repo.owner.login} /
            </Text>
          )}
          <Text style={[s.name, { color: t.text }]} numberOfLines={1}>{repo.name}</Text>
        </View>
        <Pressable
          hitSlop={10}
          onPress={onToggleFav}
          android_ripple={{ color: t.surface2, borderless: true, radius: 22 }}
        >
          <Ionicons
            name={fav ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={fav ? t.accent : t.muted}
          />
        </Pressable>
      </View>

      {!!repo.description && (
        <Text style={[s.desc, { color: t.muted }]} numberOfLines={2}>
          {repo.description}
        </Text>
      )}

      <View style={s.meta}>
        {repo.language && (
          <View style={s.metaItem}>
            <View style={[s.dot, { backgroundColor: langColor(repo.language) }]} />
            <Text style={[s.metaText, { color: t.muted }]}>{repo.language}</Text>
          </View>
        )}
        <View style={s.metaItem}>
          <Ionicons name="star" size={12} color={t.star} />
          <Text style={[s.metaText, { color: t.muted }]}>{compactNumber(repo.stargazers_count)}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={12} color={t.muted} />
          <Text style={[s.metaText, { color: t.muted }]}>{formatDate(repo.pushed_at)}</Text>
        </View>
        {repo.archived && <Text style={[s.metaText, { color: t.danger }]}>архив</Text>}
        {repo.fork && <Text style={[s.metaText, { color: t.muted }]}>форк</Text>}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 16, borderWidth: 1, borderRadius: 16, marginBottom: 12,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  owner: { fontSize: 12, fontWeight: '600' },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12.5, fontWeight: '600' },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
