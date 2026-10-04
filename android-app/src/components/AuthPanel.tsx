import React from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme';

const mmss = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Карточка входа через GitHub.
 * web-flow (если задан client secret): один тап, код вводить не нужно.
 * device-flow (фолбэк): код копируется сам, вводится на странице GitHub.
 */
export default function AuthPanel({
  showSignOut = false,
  title = 'Войти через GitHub',
}: { showSignOut?: boolean; title?: string }) {
  const { t } = useTheme();
  const {
    user, loading, device, secondsLeft, error, copied,
    awaiting, method, beginLogin, cancelLogin, signOut, copyCode, openVerification,
  } = useAuth();

  if (loading) {
    return (
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  // --- уже авторизован ---
  if (user) {
    return (
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={s.row}>
          <Image source={{ uri: user.avatar_url }} style={s.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={[s.heading, { color: t.text, marginBottom: 0 }]} numberOfLines={1}>
              {user.name || user.login}
            </Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>@{user.login}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: t.accentSoft }]}>
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>5000/час</Text>
          </View>
        </View>
        {showSignOut && (
          <Pressable
            onPress={signOut}
            style={[s.ghostBtn, { borderColor: t.border, marginTop: 14 }]}
            android_ripple={{ color: t.surface2 }}
          >
            <Ionicons name="log-out-outline" size={18} color={t.danger} />
            <Text style={{ color: t.danger, fontWeight: '700', marginLeft: 8 }}>Выйти</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // --- web-flow: ждём нажатия «Authorize» на странице GitHub ---
  if (method === 'web' && awaiting) {
    return (
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={s.row}>
          <Ionicons name="logo-github" size={22} color={t.text} />
          <Text style={[s.heading, { color: t.text, marginBottom: 0 }]}>Подтвердите вход</Text>
        </View>
        <Text style={[s.text, { color: t.muted }]}>
          Страница GitHub открыта поверх приложения. Нажмите <Text style={{ fontWeight: '700' }}>Authorize</Text> —
          токен подхватится сам, код вводить не нужно.
        </Text>
        {!!error && (
          <Text style={{ color: t.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>
        )}
        <Pressable
          onPress={openVerification}
          android_ripple={{ color: '#fff3' }}
          style={[s.primaryBtn, { backgroundColor: t.text }]}
        >
          <Ionicons name="open-outline" size={18} color={t.bg} />
          <Text style={{ color: t.bg, fontWeight: '700', marginLeft: 8 }}>
            Открыть GitHub снова
          </Text>
        </Pressable>
        <View style={s.footerRow}>
          <Text style={{ color: t.muted, fontSize: 12.5 }}>Ждём подтверждения…</Text>
          <Pressable onPress={cancelLogin} hitSlop={8}>
            <Text style={{ color: t.danger, fontSize: 12.5, fontWeight: '700' }}>Отменить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- device-flow: показываем код ---
  if (device) {
    return (
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={s.row}>
          <Ionicons name="logo-github" size={22} color={t.text} />
          <Text style={[s.heading, { color: t.text, marginBottom: 0 }]}>Подтвердите вход</Text>
        </View>

        <Text style={[s.text, { color: t.muted }]}>
          {copied
            ? 'Код уже в буфере обмена — вставьте его на странице GitHub.'
            : 'Нажмите на код, чтобы скопировать, и вставьте его на странице GitHub.'}
        </Text>

        <Pressable
          onPress={copyCode}
          android_ripple={{ color: t.accentSoft }}
          style={[s.codeBox, {
            backgroundColor: t.surface2,
            borderColor: copied ? t.accent : t.border,
          }]}
        >
          <Text style={[s.code, { color: t.text }]}>{device.user_code}</Text>
          <View style={s.copyHint}>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={16}
              color={copied ? t.accent : t.muted}
            />
            <Text style={{
              color: copied ? t.accent : t.muted,
              fontSize: 12.5, marginLeft: 6, fontWeight: '600',
            }}>
              {copied ? 'Скопировано' : 'Скопировать'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={openVerification}
          android_ripple={{ color: '#fff3' }}
          style={[s.primaryBtn, { backgroundColor: t.text }]}
        >
          <Ionicons name="open-outline" size={18} color={t.bg} />
          <Text style={{ color: t.bg, fontWeight: '700', marginLeft: 8 }}>Открыть GitHub</Text>
        </Pressable>

        <View style={s.footerRow}>
          <Text style={{ color: t.muted, fontSize: 12.5 }}>
            Ждём подтверждения · {mmss(secondsLeft)}
          </Text>
          <Pressable onPress={cancelLogin} hitSlop={8}>
            <Text style={{ color: t.danger, fontSize: 12.5, fontWeight: '700' }}>Отменить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- ещё не входил ---
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={s.row}>
        <Ionicons name="logo-github" size={22} color={t.text} />
        <Text style={[s.heading, { color: t.text, marginBottom: 0 }]}>{title}</Text>
      </View>
      <Text style={[s.text, { color: t.muted }]}>
        {method === 'web'
          ? 'Один тап: откроется страница GitHub внутри приложения. Вводить код не нужно — токен подхватится сам. Лимит вырастет с 60 до 5000 запросов в час.'
          : 'Один тап: код скопируется сам, страница GitHub откроется внутри приложения. Лимит вырастет с 60 до 5000 запросов в час.'}
      </Text>
      {!!error && (
        <Text style={{ color: t.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>
      )}
      <Pressable
        onPress={beginLogin}
        android_ripple={{ color: '#fff3' }}
        style={[s.primaryBtn, { backgroundColor: t.text }]}
      >
        <Ionicons name="logo-github" size={18} color={t.bg} />
        <Text style={{ color: t.bg, fontWeight: '700', marginLeft: 8 }}>Войти</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, borderWidth: 1, marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: '700', flex: 1, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#333' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  codeBox: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 12,
  },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 5 },
  copyHint: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12,
  },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, paddingVertical: 12, borderRadius: 12,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12,
  },
});
