import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { formatTime } from '../lib/format';
import { colors } from '../lib/theme';

type Props = { position: number; duration: number; onSeek: (seconds: number) => void };

/** Barre de progression : on peut toucher ou glisser pour avancer dans le morceau. */
export function SeekBar({ position, duration, onSeek }: Props) {
  const width = useRef(1);
  const [dragging, setDragging] = useState<number | null>(null);

  const ratioAt = (e: GestureResponderEvent) => Math.min(1, Math.max(0, e.nativeEvent.locationX / width.current));
  const shown = dragging ?? (duration > 0 ? position / duration : 0);

  return (
    <View>
      <View
        style={styles.touch}
        onLayout={(e: LayoutChangeEvent) => (width.current = e.nativeEvent.layout.width || 1)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setDragging(ratioAt(e))}
        onResponderMove={(e) => setDragging(ratioAt(e))}
        onResponderRelease={(e) => {
          if (duration > 0) onSeek(ratioAt(e) * duration);
          setDragging(null);
        }}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${shown * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: `${shown * 100}%` }, dragging !== null && styles.thumbBig]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(shown * duration)}</Text>
        <Text style={styles.time}>-{formatTime(Math.max(0, duration - shown * duration))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.text },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, backgroundColor: colors.text },
  thumbBig: { width: 20, height: 20, borderRadius: 10, marginLeft: -10 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
