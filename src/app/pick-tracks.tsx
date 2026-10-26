import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TrackRow } from '../components/TrackRow';
import { matchesSearch, sortTracks } from '../lib/format';
import { useLibrary } from '../lib/library';
import { colors, spacing } from '../lib/theme';

/** Sélection multiple de morceaux à ajouter dans une playlist. */
export default function PickTracksScreen() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const { tracks, playlists, addToPlaylist, settings } = useLibrary();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const playlist = playlists.find((p) => p.id === playlistId);
  const already = useMemo(() => new Set(playlist?.trackIds), [playlist]);
  const visible = useMemo(
    () => sortTracks(tracks.filter((t) => matchesSearch(t, query)), settings.sortKey, settings.sortAsc),
    [tracks, query, settings.sortKey, settings.sortAsc]
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const done = () => {
    if (playlist && selected.length) addToPlaylist(playlist.id, selected);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: playlist ? `Ajouter à « ${playlist.name} »` : 'Ajouter des morceaux',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Text style={styles.link}>Annuler</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={done}>
              <Text style={[styles.link, { fontWeight: '700' }]}>
                {selected.length ? `Ajouter (${selected.length})` : 'OK'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>
      <Pressable
        style={styles.selectAll}
        onPress={() =>
          setSelected((s) => (s.length === visible.length ? [] : visible.map((t) => t.id)))
        }
      >
        <Text style={styles.link}>{selected.length === visible.length && visible.length ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
      </Pressable>
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => {
          const isOn = selected.includes(item.id);
          return (
            <TrackRow
              track={item}
              onPress={() => toggle(item.id)}
              left={
                <Ionicons
                  name={isOn ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isOn ? colors.accent : colors.muted}
                />
              }
              right={already.has(item.id) ? <Text style={styles.already}>déjà dedans</Text> : undefined}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.accent, fontSize: 17 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    margin: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 16 },
  selectAll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  already: { color: colors.muted, fontSize: 12 },
});
