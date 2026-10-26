import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

const PALETTE = ['#FF4D6D', '#7B61FF', '#2EC4B6', '#FF9F1C', '#3A86FF', '#E056FD', '#20BF55', '#F15BB5'];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Pochette générée : une couleur stable par artiste. */
export function Cover({ seed, size, icon = 'musical-notes' }: { seed: string; size: number; icon?: keyof typeof Ionicons.glyphMap }) {
  const color = PALETTE[hash(seed || '?') % PALETTE.length];
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: Math.max(6, size / 8), backgroundColor: color + '33', borderColor: color + '66' },
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
