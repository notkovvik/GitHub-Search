import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { isUserFav, toggleUser, subscribeFavs } from '../storage/favorites';

type U = { id?: number; login: string; avatar_url: string; name?: string | null; bio?: string | null; type?: string };

export default function UserCard({ user, onPress }: { user: U; onPress: () => void }) {
  const { t } = useTheme();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    isUserFav(user.login).then((v) => mounted && setFav(v));
    const unsub = subscribeFavs(() => {
      isUserFav(user.login).then((v) => mounted && setFav(v));
    });
    return () => { mounted = false; unsub(); };
  }, [user.login]);

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
      <Image source={{ uri: user.avatar_url }} style={s.avatar} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.name, { color: t.text }]} numberOfLines={1}>
          {user.name || user.login}
        </Text>
        <Text style={[s.login, { color: t.muted }]} numberOfLines={1}>
          @{user.login}{user.type && user.type !== 'User' ? ` · ${user.type}` : ''}
        </Text>
      </View>
      <Pressable
        hitSlop={10}
        onPress={async () => toggleUser({ login: user.login, avatar_url: user.avatar_url, name: user.name })}
        android_ripple={{ color: t.surface2, borderless: true, radius: 22 }}
      >
        <Ionicons
          name={fav ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={fav ? t.accent : t.muted}
        />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderWidth: 1, borderRadius: 16, marginBottom: 10,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#222' },
  name: { fontSize: 16, fontWeight: '700' },
  login: { fontSize: 13, marginTop: 2 },
});