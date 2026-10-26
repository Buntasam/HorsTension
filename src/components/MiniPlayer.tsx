import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayer } from '../lib/player';
import { colors, spacing } from '../lib/theme';
import { Cover } from './Cover';

export function MiniPlayer() {
  const { currentTrack, playing, togglePlay, next, currentTime, duration } = usePlayer();
  if (!currentTrack) return null;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <Pressable style={styles.wrap} onPress={() => router.push('/player')}>
      <View style={styles.row}>
        <Cover seed={currentTrack.artist || currentTrack.title} size={40} />
        <View style={styles.texts}>
          <Text numberOfLines={1} style={styles.title}>
            {currentTrack.title}
          </Text>
          <Text numberOfLines={1} style={styles.sub}>
            {currentTrack.artist || 'Artiste inconnu'}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={togglePlay} style={styles.btn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={26} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={10} onPress={next} style={styles.btn}>
          <Ionicons name="play-forward" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.cardHigh,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.md },
  texts: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 13 },
  btn: { paddingHorizontal: spacing.xs },
  bar: { height: 2, backgroundColor: colors.border },
  fill: { height: 2, backgroundColor: colors.accent },
});
