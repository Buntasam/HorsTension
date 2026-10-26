import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/Cover';
import { prompt } from '../../components/useTrackMenu';
import { formatTotal } from '../../lib/format';
import { useLibrary } from '../../lib/library';
import { colors, spacing } from '../../lib/theme';

export default function PlaylistsScreen() {
  const { playlists, trackById, createPlaylist } = useLibrary();

  const create = async () => {
    const name = await prompt('Nouvelle playlist', '', 'Donne-lui un nom');
    if (!name) return;
    const id = createPlaylist(name);
    router.push({ pathname: '/pick-tracks', params: { playlistId: id } });
  };

  return (
    <FlatList
      data={playlists}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <Pressable style={styles.row} onPress={create}>
          <View style={styles.newIcon}>
            <Ionicons name="add" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.name, { color: colors.accent }]}>Nouvelle playlist</Text>
        </Pressable>
      }
      ListEmptyComponent={<Text style={styles.hint}>Crée ta première playlist, puis ajoutes-y des morceaux.</Text>}
      renderItem={({ item }) => {
        const duration = item.trackIds.reduce((s, id) => s + (trackById.get(id)?.duration ?? 0), 0);
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}
          >
            <Cover seed={item.name} size={56} icon="list" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.sub}>
                {item.trackIds.length} titres · {formatTotal(duration)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  newIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  hint: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
