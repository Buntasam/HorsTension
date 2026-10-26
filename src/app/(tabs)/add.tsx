import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Paths } from 'expo-file-system';

import { librarySize } from '../../lib/files';
import { formatBytes } from '../../lib/format';
import { useLibrary } from '../../lib/library';
import { colors, spacing } from '../../lib/theme';

export default function AddScreen() {
  const lib = useLibrary();
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const used = useMemo(() => librarySize(lib.tracks), [lib.tracks]);
  let free = 0;
  try {
    free = Paths.availableDiskSpace;
  } catch {}

  const importFiles = async () => {
    setImporting(true);
    try {
      const n = await lib.importFromFiles();
      if (n > 0) Alert.alert('Import terminé', `${n} morceau(x) ajouté(s) à ta bibliothèque.`);
    } catch (e) {
      Alert.alert('Import', e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const download = () => {
    const link = url.trim();
    if (!/^https?:\/\//i.test(link)) {
      return Alert.alert('Lien invalide', 'Colle un lien qui commence par http:// ou https://');
    }
    if (/youtu\.?be/i.test(link)) {
      // Un lien YouTube n'est pas un fichier audio : on passe par un site de conversion dans le navigateur.
      return router.navigate({ pathname: '/browser', params: { open: link } });
    }
    setUrl('');
    lib.downloadUrl(link);
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="logo-youtube" size={22} color={colors.accent} />
          <Text style={styles.cardTitle}>YouTube, mixes, SoundCloud…</Text>
        </View>
        <Text style={styles.text}>
          Ouvre l'onglet <Text style={styles.bold}>Navigateur</Text>, va sur ton site de conversion YouTube → MP3 préféré,
          colle le lien de la vidéo, du mix ou de la playlist, puis appuie sur « Télécharger » : le fichier arrive
          directement dans ta bibliothèque.
        </Text>
        <Pressable style={styles.primary} onPress={() => router.navigate('/browser')}>
          <Ionicons name="globe-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>Ouvrir le navigateur</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="folder-open" size={22} color={colors.accent} />
          <Text style={styles.cardTitle}>Depuis l'app Fichiers</Text>
        </View>
        <Text style={styles.text}>
          MP3, M4A, WAV, FLAC… Tu peux en choisir plusieurs d'un coup : téléchargements Safari, AirDrop, iCloud Drive,
          clé USB, a-Shell…
        </Text>
        <Pressable style={styles.primary} onPress={importFiles} disabled={importing}>
          {importing ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
          <Text style={styles.primaryText}>Choisir des fichiers</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="link" size={22} color={colors.accent} />
          <Text style={styles.cardTitle}>Lien direct vers un fichier audio</Text>
        </View>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://…/morceau.mp3"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={download}
        />
        <Pressable style={styles.secondary} onPress={download}>
          <Text style={styles.secondaryText}>Télécharger</Text>
        </Pressable>
      </View>

      {lib.downloads.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { flex: 1 }]}>Téléchargements</Text>
            <Pressable onPress={lib.clearFinishedDownloads}>
              <Text style={styles.link}>Effacer</Text>
            </Pressable>
          </View>
          {lib.downloads.map((d) => (
            <View key={d.id} style={styles.download}>
              <Ionicons
                name={d.status === 'done' ? 'checkmark-circle' : d.status === 'error' ? 'alert-circle' : 'cloud-download'}
                size={20}
                color={d.status === 'done' ? colors.success : d.status === 'error' ? colors.danger : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.downloadLabel}>
                  {d.label}
                </Text>
                {d.status === 'downloading' && (
                  <View style={styles.bar}>
                    <View style={[styles.fill, { width: `${Math.round(d.progress * 100)}%` }]} />
                  </View>
                )}
                {d.error && <Text style={styles.error}>{d.error}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.storage}>
        {lib.tracks.length} morceaux · {formatBytes(used)} utilisés{free > 0 ? ` · ${formatBytes(free)} libres` : ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  bold: { color: colors.text, fontWeight: '700' },
  primary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 10, paddingVertical: 12 },
  secondaryText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  link: { color: colors.accent, fontSize: 15 },
  download: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  downloadLabel: { color: colors.text, fontSize: 14 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent },
  error: { color: colors.danger, fontSize: 13, marginTop: 2 },
  storage: { color: colors.muted, textAlign: 'center', fontSize: 13 },
});
