import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '../lib/format';
import { colors, spacing } from '../lib/theme';
import type { Track } from '../lib/types';
import { Cover } from './Cover';

type Props = {
  track: Track;
  active?: boolean;
  onPress?: () => void;
  onMore?: () => void;
  right?: ReactNode;
  left?: ReactNode;
};

export const TrackRow = memo(function TrackRow({ track, active, onPress, onMore, right, left }: Props) {
  return (
    <Pressable onPress={onPress} onLongPress={onMore} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {left}
      <Cover seed={track.artist || track.title} size={44} />
      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {track.artist || 'Artiste inconnu'} · {formatTime(track.duration)}
        </Text>
      </View>
      {right}
      {onMore && (
        <Pressable hitSlop={12} onPress={onMore} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.card },
  texts: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '500' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  more: { padding: spacing.xs },
});
