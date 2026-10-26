import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TrackRow } from '../../components/TrackRow';
import { useTrackMenu } from '../../components/useTrackMenu';
import { formatTotal, matchesSearch, SORT_LABELS, sortTracks } from '../../lib/format';
import { useLibrary } from '../../lib/library';
import { usePlayer } from '../../lib/player';
import { colors, spacing } from '../../lib/theme';
import type { SortKey } from '../../lib/types';

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

export default function LibraryScreen() {
  const { tracks, settings, updateSettings, loaded } = useLibrary();
  const player = usePlayer();
  const menu = useTrackMenu();
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => sortTracks(tracks.filter((t) => matchesSearch(t, query)), settings.sortKey, settings.sortAsc),
    [tracks, query, settings.sortKey, settings.sortAsc]
  );
  const ids = useMemo(() => visible.map((t) => t.id), [visible]);
  const total = useMemo(() => visible.reduce((s, t) => s + (t.duration ?? 0), 0), [visible]);

  const chooseSort = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Trier par',
        options: [...SORT_KEYS.map((k) => (k === settings.sortKey ? `✓ ${SORT_LABELS[k]}` : SORT_LABELS[k])), 'Annuler'],
        cancelButtonIndex: SORT_KEYS.length,
        userInterfaceStyle: 'dark',
      },
      (i) => {
        if (i >= SORT_KEYS.length) return;
        const key = SORT_KEYS[i];
        // Par défaut : A→Z pour les textes, plus récent / plus long / plus écouté en premier sinon.
        updateSettings({ sortKey: key, sortAsc: key === 'title' || key === 'artist' });
      }
    );

  if (loaded && tracks.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="musical-notes-outline" size={64} color={colors.muted} />
        <Text style={styles.emptyTitle}>Aucune musique pour l'instant</Text>
        <Text style={styles.emptyText}>Importe des fichiers ou télécharge des sons depuis l'onglet Ajouter.</Text>
        <Pressable style={styles.primary} onPress={() => router.navigate('/add')}>
          <Text style={styles.primaryText}>Ajouter de la musique</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(t) => t.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un titre, un artiste…"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
          <View style={styles.toolbar}>
            <Pressable style={styles.chip} onPress={chooseSort}>
              <Ionicons name="swap-vertical" size={16} color={colors.text} />
              <Text style={styles.chipText}>{SORT_LABELS[settings.sortKey]}</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => updateSettings({ sortAsc: !settings.sortAsc })}>
              <Ionicons name={settings.sortAsc ? 'arrow-up' : 'arrow-down'} size={16} color={colors.text} />
            </Pressable>
            <Text style={styles.count}>
              {visible.length} titres · {formatTotal(total)}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => player.playTracks(ids, undefined, { shuffle: false })}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.primaryText}>Tout lire</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => player.playTracks(ids, undefined, { shuffle: true })}>
              <Ionicons name="shuffle" size={18} color={colors.accent} />
              <Text style={styles.secondaryText}>Aléatoire</Text>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <TrackRow
          track={item}
          active={player.currentTrack?.id === item.id}
          onPress={() => player.playTracks(ids, item.id)}
          onMore={() => menu.open(item)}
        />
      )}
      ListFooterComponent={<View style={{ height: spacing.xl }} />}
    />
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 16 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { color: colors.text, fontSize: 14 },
  count: { color: colors.muted, marginLeft: 'auto', fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.md },
  primary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingVertical: 12,
  },
  secondaryText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 15, marginBottom: spacing.md },
});
