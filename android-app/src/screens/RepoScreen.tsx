import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { openInBrowser } from '../utils/openBrowser';
import { gh, ApiError } from '../api/github';
import { useTheme } from '../theme';
import { compactNumber, formatDate, langColor } from '../utils/format';
import { isRepoFav, toggleRepo, subscribeFavs } from '../storage/favorites';
import EmptyState from '../components/EmptyState';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Домашняя страница проекта: homepage или GitHub Pages (как siteFor() в веб-версии). */
function siteFor(r: any): string | null {
  const home = (r?.homepage || '').trim();
  if (home && /^https?:\/\//i.test(home)) return home;
  if (r?.has_pages && r?.owner?.login) {
    const owner = r.owner.login;
    const name = r.name || '';
    if (name.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
      return `https://${owner}.github.io/`;
    }
    return `https://${owner}.github.io/${encodeURIComponent(name)}/`;
  }
  return null;
}

const zipUrl = (owner: string, name: string, branch: string) =>
  `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` +
  `/archive/refs/heads/${encodeURIComponent(branch || 'main')}.zip`;

/**
 * Ссылки и файлы открываем через явный пакет браузера.
 *
 * Раньше здесь был WebBrowser.openBrowserAsync, но это обычный ACTION_VIEW, а
 * приложение одобрено как обработчик github.com — система возвращала запрос в
 * само приложение, и «Скачать код» / «Файлы релизов» не скачивались вообще.
 */
const openInApp = (url: string) => openInBrowser(url);

export default function RepoScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const { owner, name } = route.params;
  const [repo, setRepo] = useState<any>(null);
  const [langs, setLangs] = useState<Record<string, number>>({});
  const [release, setRelease] = useState<any>(null);
  const [relState, setRelState] = useState<'idle' | 'loading' | 'done' | 'error' | 'none'>('idle');
  const [showReleases, setShowReleases] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await gh.repo(owner, name);
        if (!alive) return;
        setRepo(r);
        gh.languages(owner, name)
          .then((x) => alive && setLangs(x))
          .catch(() => {});
      } catch (e: any) {
        if (!alive) return;
        if (e instanceof ApiError && e.code === 'RATE_LIMIT') { setRateLimited(true); setErr('Лимит GitHub исчерпан'); }
        else if (e instanceof ApiError && e.code === 'NOT_FOUND') setErr('Репозиторий не найден');
        else setErr('Не удалось загрузить репозиторий');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [owner, name]);

  useEffect(() => {
    let alive = true;
    isRepoFav(route.params?.id ?? -1).then((v) => alive && setFav(v));
    const unsub = subscribeFavs(() => {
      isRepoFav(repo?.id ?? -1).then((v) => alive && setFav(v));
    });
    return () => { alive = false; unsub(); };
  }, [repo?.id]);

  // Файлы релизов — лениво, по нажатию (как в веб-версии)
  const loadRelease = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (showReleases) { setShowReleases(false); return; }
    setShowReleases(true);
    if (relState !== 'idle') return;
    setRelState('loading');
    try {
      const r = await gh.releases(owner, name);
      setRelease(r);
      setRelState(r?.assets?.length ? 'done' : 'none');
    } catch (e: any) {
      setRelState(e instanceof ApiError && e.code === 'NOT_FOUND' ? 'none' : 'error');
    }
  }, [showReleases, relState, owner, name]);

  const copyLink = useCallback(async () => {
    if (!repo) return;
    await Clipboard.setStringAsync(`https://github.com/${repo.owner.login}/${repo.name}.git`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [repo]);

  const totalLangs = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  const site = repo ? siteFor(repo) : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Шапка в потоке — кнопка «назад» больше не лежит поверх текста */}
      <View style={[s.header, {
        paddingTop: insets.top + 8,
        borderBottomColor: t.border,
        backgroundColor: t.bg,
      }]}
      >
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={12}
          android_ripple={{ color: t.surface2, borderless: true, radius: 22 }}
          style={[s.back, { backgroundColor: t.surface, borderColor: t.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text numberOfLines={1} style={[s.headerTitle, { color: t.text }]}>
          {owner} / {name}
        </Text>
        <Pressable
          hitSlop={12}
          onPress={async () => {
            if (!repo) return;
            await toggleRepo({
              id: repo.id,
              owner: repo.owner.login,
              name: repo.name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              url: repo.html_url,
            });
          }}
          android_ripple={{ color: t.surface2, borderless: true, radius: 22 }}
          style={[s.back, { backgroundColor: t.surface, borderColor: t.border }]}
        >
          <Ionicons
            name={fav ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={fav ? t.accent : t.text}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={t.accent} /></View>
      ) : err || !repo ? (
        <EmptyState
          icon="alert-circle-outline"
          title={err ?? 'Ошибка'}
          hint={rateLimited ? 'Без входа лимит — 60 запросов в час, после входа — 5000.' : undefined}
          actionLabel={rateLimited ? 'Войти через GitHub' : undefined}
          onAction={rateLimited ? () => nav.navigate('Tabs', { screen: 'Settings' }) : undefined}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Pressable
            onPress={() => nav.navigate('Profile', { login: repo.owner.login, filterRepo: repo.name })}
            hitSlop={6}
          >
            <Text style={[s.owner, { color: t.accent }]}>{repo.owner.login} /</Text>
          </Pressable>
          <Text style={[s.name, { color: t.text }]}>{repo.name}</Text>

          <Text style={[s.desc, { color: t.muted }]}>
            {repo.description || 'Описание пока не добавлено.'}
          </Text>

          <View style={s.dates}>
            {!!repo.created_at && (
              <Text style={[s.dateText, { color: t.muted }]}>
                создан: {formatDate(repo.created_at)}
              </Text>
            )}
            {!!repo.pushed_at && (
              <Text style={[s.dateText, { color: t.muted }]}>
                обновлён: {formatDate(repo.pushed_at)}
              </Text>
            )}
          </View>

          <View style={s.badges}>
            {!!repo.language && (
              <View style={[s.pill, { backgroundColor: t.surface2 }]}>
                <View style={[s.dot, { backgroundColor: langColor(repo.language) }]} />
                <Text style={[s.pillText, { color: t.text }]}>{repo.language}</Text>
              </View>
            )}
            <View style={[s.pill, { backgroundColor: t.surface2 }]}>
              <Ionicons name="star" size={12} color={t.star} />
              <Text style={[s.pillText, { color: t.text }]}>
                {compactNumber(repo.stargazers_count ?? 0)}
              </Text>
            </View>
            {repo.archived && (
              <View style={[s.pill, { backgroundColor: t.surface2 }]}>
                <Text style={[s.pillText, { color: t.danger }]}>📦 Архив</Text>
              </View>
            )}
            {repo.fork && (
              <View style={[s.pill, { backgroundColor: t.surface2 }]}>
                <Text style={[s.pillText, { color: t.text }]}>⑂ Форк</Text>
              </View>
            )}
          </View>

          <View style={s.statsRow}>
            <Big label="Звёзд" value={compactNumber(repo.stargazers_count ?? 0)} t={t} />
            <Big label="Форков" value={compactNumber(repo.forks_count ?? 0)} t={t} />
            <Big label="Issues" value={compactNumber(repo.open_issues_count ?? 0)} t={t} />
          </View>

          {/* Действия: как на сайте — сайт, скачивание кода, GitHub */}
          <View style={s.actions}>
            <Action
              icon="download-outline"
              label="Скачать код"
              t={t}
              primary
              onPress={() => openInApp(zipUrl(repo.owner.login, repo.name, repo.default_branch))}
            />
            {!!site && (
              <Action
                icon="globe-outline"
                label="Открыть сайт"
                t={t}
                onPress={() => openInApp(site)}
              />
            )}
            <Action
              icon="logo-github"
              label="GitHub"
              t={t}
              onPress={() => openInApp(repo.html_url)}
            />
            <Action
              icon={copied ? 'checkmark' : 'link-outline'}
              label={copied ? 'Скопировано' : 'Ссылка'}
              t={t}
              onPress={copyLink}
            />
          </View>

          {/* Файлы релизов — ленивая загрузка */}
          <Pressable
            onPress={loadRelease}
            android_ripple={{ color: t.surface2 }}
            style={[s.relBtn, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <Ionicons name="pricetags-outline" size={17} color={t.text} />
            <Text style={{ color: t.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>
              Файлы релизов
            </Text>
            {relState === 'loading'
              ? <ActivityIndicator size="small" color={t.accent} />
              : (
                <Ionicons
                  name={showReleases ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={t.muted}
                />
              )}
          </Pressable>

          {showReleases && (
            <View style={[s.relBox, { borderColor: t.border, backgroundColor: t.surface }]}>
              {relState === 'loading' && (
                <Text style={{ color: t.muted, fontSize: 13.5 }}>Проверяем последний релиз…</Text>
              )}
              {relState === 'error' && (
                <Text style={{ color: t.danger, fontSize: 13.5 }}>
                  Не удалось проверить релизы. Попробуйте позже.
                </Text>
              )}
              {relState === 'none' && (
                <Text style={{ color: t.muted, fontSize: 13.5 }}>
                  Публичных релизов с файлами нет. Исходники доступны по кнопке «Скачать код».
                </Text>
              )}
              {relState === 'done' && !!release && (
                <>
                  <Text style={{ color: t.text, fontWeight: '700', marginBottom: 10 }}>
                    {release.name || release.tag_name}
                  </Text>
                  {release.assets
                    .filter((a: any) => !!a.browser_download_url)
                    .slice(0, 8)
                    .map((a: any) => (
                      <Pressable
                        key={a.id}
                        onPress={() => openInApp(a.browser_download_url)}
                        android_ripple={{ color: t.surface2 }}
                        style={[s.asset, { backgroundColor: t.surface2 }]}
                      >
                        <Ionicons name="download-outline" size={17} color={t.accent} />
                        <Text numberOfLines={1} style={{ color: t.text, flex: 1, marginLeft: 8 }}>
                          {a.name}
                        </Text>
                        {!!a.size && (
                          <Text style={{ color: t.muted, fontSize: 12 }}>
                            {(a.size / 1024 / 1024).toFixed(1)} МБ
                          </Text>
                        )}
                      </Pressable>
                    ))}
                </>
              )}
              <Pressable
                onPress={() => openInApp(`${repo.html_url}/releases`)}
                style={{ marginTop: 10 }}
              >
                <Text style={{ color: t.accent, fontWeight: '700' }}>Все релизы ↗</Text>
              </Pressable>
            </View>
          )}

          {!!repo.topics?.length && (
            <>
              <Section title="Темы" t={t} />
              <View style={s.topics}>
                {repo.topics.slice(0, 12).map((tp: string) => (
                  <View key={tp} style={[s.pill, { backgroundColor: t.accentSoft }]}>
                    <Text style={[s.pillText, { color: t.accent }]}>{tp}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {!!Object.keys(langs).length && (
            <>
              <Section title="Языки" t={t} />
              <View style={s.langList}>
                {Object.entries(langs)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([l, bytes]) => (
                    <View key={l} style={{ marginBottom: 10 }}>
                      <View style={s.langHead}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[s.dot, { backgroundColor: langColor(l) }]} />
                          <Text style={{ color: t.text, fontWeight: '600' }}>{l}</Text>
                        </View>
                        <Text style={{ color: t.muted, fontSize: 12 }}>
                          {((bytes / totalLangs) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[s.langBar, { backgroundColor: t.surface2 }]}>
                        <View style={{
                          height: '100%',
                          width: `${(bytes / totalLangs) * 100}%`,
                          backgroundColor: langColor(l),
                          borderRadius: 3,
                        }} />
                      </View>
                    </View>
                  ))}
              </View>
            </>
          )}

          <Section title="О репозитории" t={t} />
          <Info label="Ветка по умолчанию" value={repo.default_branch || '—'} t={t} />
          <Info
            label="Лицензия"
            value={repo.license?.spdx_id || repo.license?.name || '—'}
            t={t}
          />
          <Info
            label="Размер"
            value={repo.size ? `${(repo.size / 1024).toFixed(1)} МБ` : '—'}
            t={t}
          />
          <Info
            label="Наблюдателей"
            value={compactNumber(repo.subscribers_count ?? repo.watchers_count ?? 0)}
            t={t}
          />
        </ScrollView>
      )}
    </View>
  );
}

function Big({ label, value, t }: any) {
  return (
    <View style={[s.big, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[s.bigVal, { color: t.text }]}>{value}</Text>
      <Text style={[s.bigLbl, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, t, primary = false }: any) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: primary ? '#fff3' : t.surface2 }}
      style={[s.actionBtn, {
        backgroundColor: primary ? t.text : t.surface,
        borderColor: primary ? t.text : t.border,
      }]}
    >
      <Ionicons name={icon} size={17} color={primary ? t.bg : t.text} />
      <Text style={{
        color: primary ? t.bg : t.text, fontWeight: '700', marginLeft: 6, fontSize: 13.5,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, t }: any) {
  return <Text style={[s.section, { color: t.muted }]}>{title.toUpperCase()}</Text>;
}

function Info({ label, value, t }: any) {
  return (
    <View style={[s.infoRow, { borderBottomColor: t.border }]}>
      <Text style={{ color: t.muted }}>{label}</Text>
      <Text style={{ color: t.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  back: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  owner: { fontSize: 14, fontWeight: '600' },
  name: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  desc: { fontSize: 15, lineHeight: 21, marginTop: 12 },
  dates: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12,
    paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8883',
  },
  dateText: { fontSize: 12.5, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  pillText: { fontSize: 12.5, fontWeight: '600' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  big: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  bigVal: { fontSize: 18, fontWeight: '800' },
  bigLbl: { fontSize: 11.5, marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  actionBtn: {
    flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 12, borderWidth: 1,
  },
  relBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20,
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
  },
  relBox: { marginTop: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  asset: {
    flexDirection: 'row', alignItems: 'center', padding: 11,
    borderRadius: 10, marginBottom: 8,
  },
  section: {
    fontSize: 12, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 26, marginBottom: 12,
  },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langList: { gap: 8 },
  langHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  langBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
