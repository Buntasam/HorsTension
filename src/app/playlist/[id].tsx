import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/Cover';
import { TrackRow } from '../../components/TrackRow';
import { confirm, prompt, useTrackMenu } from '../../components/useTrackMenu';
import { formatTotal } from '../../lib/format';
import { useLibrary } from '../../lib/library';
import { usePlayer } from '../../lib/player';
import { colors, spacing } from '../../lib/theme';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lib = useLibrary();
  const player = usePlayer();
  const menu = useTrackMenu();
  const [editing, setEditing] = useState(false);

  const playlist = lib.playlists.find((p) => p.id === id);
  if (!playlist) return <Stack.Screen options={{ title: 'Playlist supprimée' }} />;

  const entries = playlist.trackIds
    .map((trackId, index) => ({ index, track: lib.trackById.get(trackId) }))
    .filter((e): e is { index: number; track: NonNullable<typeof e.track> } => !!e.track);
  const duration = entries.reduce((s, e) => s + (e.track.duration ?? 0), 0);

  const openMenu = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: playlist.name,
        options: ['Renommer', 'Supprimer la playlist', 'Annuler'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        userInterfaceStyle: 'dark',
      },
      async (i) => {
        if (i === 0) {
          const name = await prompt('Renommer la playlist', playlist.name);
          if (name) lib.renamePlaylist(playlist.id, name);
        } else if (i === 1) {
          if (await confirm('Supprimer la playlist ?', 'Les morceaux restent dans ta bibliothèque.', 'Supprimer')) {
            router.back();
            lib.deletePlaylist(playlist.id);
          }
        }
      }
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerBtns}>
              <Pressable hitSlop={10} onPress={() => setEditing((e) => !e)}>
                <Text style={styles.headerLink}>{editing ? 'OK' : 'Modifier'}</Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={openMenu}>
                <Ionicons name="ellipsis-horizontal-circle" size={26} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={entries}
        keyExtractor={(e) => `${e.index}-${e.track.id}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Cover seed={playlist.name} size={160} icon="list" />
            <Text style={styles.title}>{playlist.name}</Text>
            <Text style={styles.sub}>
              {entries.length} titres · {formatTotal(duration)}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.primary}
                onPress={() => player.playTracks(entries.map((e) => e.track.id), undefined, { shuffle: false })}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.primaryText}>Lire</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => player.playTracks(entries.map((e) => e.track.id), undefined, { shuffle: true })}
              >
                <Ionicons name="shuffle" size={18} color={colors.accent} />
                <Text style={styles.secondaryText}>Aléatoire</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => router.push({ pathname: '/pick-tracks', params: { playlistId: playlist.id } })}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.addText}>Ajouter des morceaux</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item.track}
            active={player.currentTrack?.id === item.track.id}
            onPress={() =>
              editing ? undefined : player.playTracks(entries.map((e) => e.track.id), item.track.id)
            }
            onMore={
              editing
                ? undefined
                : () =>
                    menu.open(item.track, [
                      { label: 'Retirer de cette playlist', run: () => lib.removeFromPlaylist(playlist.id, item.index) },
                    ])
            }
            left={
              editing ? (
                <Pressable hitSlop={8} onPress={() => lib.removeFromPlaylist(playlist.id, item.index)}>
                  <Ionicons name="remove-circle" size={24} color={colors.danger} />
                </Pressable>
              ) : undefined
            }
            right={
              editing ? (
                <View style={styles.moveBtns}>
                  <Pressable
                    hitSlop={6}
                    disabled={index === 0}
                    onPress={() => lib.movePlaylistTrack(playlist.id, item.index, entries[index - 1].index)}
                  >
                    <Ionicons name="chevron-up" size={24} color={index === 0 ? colors.border : colors.text} />
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    disabled={index === entries.length - 1}
                    onPress={() => lib.movePlaylistTrack(playlist.id, item.index, entries[index + 1].index)}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={24}
                      color={index === entries.length - 1 ? colors.border : colors.text}
                    />
                  </Pressable>
                </View>
              ) : undefined
            }
          />
        )}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerLink: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  header: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing.sm, textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignSelf: 'stretch' },
  primary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  addText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  moveBtns: { flexDirection: 'row', gap: spacing.sm },
});
