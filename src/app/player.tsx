import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cover } from '../components/Cover';
import { SeekBar } from '../components/SeekBar';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../lib/library';
import { usePlayer } from '../lib/player';
import { colors, spacing } from '../lib/theme';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { trackById } = useLibrary();
  const track = p.currentTrack;

  const upcoming = p.queue
    .map((id, index) => ({ index, track: trackById.get(id) }))
    .filter((e): e is { index: number; track: NonNullable<typeof e.track> } => !!e.track && e.index > p.currentIndex);

  return (
    <View style={[styles.screen, { paddingTop: insets.top || spacing.lg }]}>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </Pressable>
        <Text style={styles.topLabel}>En cours de lecture</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={upcoming}
        keyExtractor={(e) => `${e.index}-${e.track.id}`}
        ListHeaderComponent={
          <View style={styles.main}>
            <Cover seed={track ? track.artist || track.title : ''} size={260} />
            <View style={styles.info}>
              <Text numberOfLines={2} style={styles.title}>
                {track?.title ?? 'Rien en lecture'}
              </Text>
              <Text numberOfLines={1} style={styles.artist}>
                {track ? track.artist || 'Artiste inconnu' : ''}
              </Text>
            </View>
            <View style={{ alignSelf: 'stretch' }}>
              <SeekBar position={p.currentTime} duration={p.duration} onSeek={p.seekTo} />
            </View>
            <View style={styles.controls}>
              <Pressable hitSlop={10} onPress={p.toggleShuffle}>
                <Ionicons name="shuffle" size={26} color={p.shuffle ? colors.accent : colors.muted} />
              </Pressable>
              <Pressable hitSlop={10} onPress={p.previous}>
                <Ionicons name="play-back" size={38} color={colors.text} />
              </Pressable>
              <Pressable style={styles.playBtn} onPress={p.togglePlay}>
                <Ionicons name={p.playing ? 'pause' : 'play'} size={40} color={colors.bg} style={!p.playing && { marginLeft: 4 }} />
              </Pressable>
              <Pressable hitSlop={10} onPress={p.next}>
                <Ionicons name="play-forward" size={38} color={colors.text} />
              </Pressable>
              <Pressable hitSlop={10} onPress={p.cycleRepeat}>
                <View>
                  <Ionicons name="repeat" size={26} color={p.repeat === 'off' ? colors.muted : colors.accent} />
                  {p.repeat === 'one' && <Text style={styles.one}>1</Text>}
                </View>
              </Pressable>
            </View>
            {upcoming.length > 0 && <Text style={styles.section}>À suivre · {upcoming.length}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TrackRow
            track={item.track}
            onPress={() => p.skipTo(item.index)}
            right={
              <Pressable hitSlop={10} onPress={() => p.removeFromQueue(item.index)}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            }
          />
        )}
        ListFooterComponent={<View style={{ height: insets.bottom + spacing.xl }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  topLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  main: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  info: { alignSelf: 'stretch', marginTop: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  artist: { color: colors.muted, fontSize: 18, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  one: { position: 'absolute', right: -6, top: -6, color: colors.accent, fontSize: 11, fontWeight: '800' },
  section: { alignSelf: 'stretch', color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.lg },
});
