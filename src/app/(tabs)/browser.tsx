import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { looksLikeAudioUrl } from '../../lib/files';
import { useLibrary } from '../../lib/library';
import { colors, spacing } from '../../lib/theme';

function toUrl(input: string) {
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text)) return `https://${text}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
}

/**
 * Navigateur intégré : sur un site de conversion YouTube → MP3, le bouton « Télécharger »
 * envoie le fichier directement dans la bibliothèque au lieu de l'ouvrir.
 */
export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, downloadUrl } = useLibrary();
  const params = useLocalSearchParams<{ open?: string }>();
  const web = useRef<WebView<{}>>(null);
  const [uri] = useState(settings.browserHome);
  const go = (url: string) => web.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
  const [nav, setNav] = useState<Pick<WebViewNavigation, 'url' | 'canGoBack' | 'canGoForward' | 'loading'>>({
    url: settings.browserHome,
    canGoBack: false,
    canGoForward: false,
    loading: true,
  });
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const handled = useRef(new Set<string>());

  // Lien YouTube collé dans l'onglet Ajouter : on le copie pour le coller dans le site de conversion.
  useEffect(() => {
    if (!params.open) return;
    Clipboard.setStringAsync(params.open).then(() =>
      setBanner('Lien YouTube copié ! Colle-le dans le site de conversion, puis appuie sur Télécharger.')
    );
  }, [params.open]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  const grab = (url: string) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      Alert.alert(
        'Téléchargement non compatible',
        "Ce site génère le fichier d'une façon que l'app ne peut pas récupérer. Essaie un autre site, ou télécharge-le avec Safari puis importe-le depuis Fichiers."
      );
      return;
    }
    // Certains sites déclenchent deux fois le même lien.
    if (handled.current.has(url)) return;
    handled.current.add(url);
    downloadUrl(url);
    setBanner('Téléchargement lancé… Suis la progression dans l\'onglet Ajouter.');
  };

  const isHome = nav.url === settings.browserHome;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable hitSlop={8} disabled={!nav.canGoBack} onPress={() => web.current?.goBack()}>
          <Ionicons name="chevron-back" size={24} color={nav.canGoBack ? colors.text : colors.border} />
        </Pressable>
        <Pressable hitSlop={8} disabled={!nav.canGoForward} onPress={() => web.current?.goForward()}>
          <Ionicons name="chevron-forward" size={24} color={nav.canGoForward ? colors.text : colors.border} />
        </Pressable>
        <TextInput
          style={styles.url}
          value={editing ? input : nav.url.replace(/^https?:\/\/(www\.)?/, '')}
          onFocus={() => {
            setEditing(true);
            setInput(nav.url);
          }}
          onBlur={() => setEditing(false)}
          onChangeText={setInput}
          onSubmitEditing={() => {
            go(toUrl(input));
            setEditing(false);
          }}
          selectTextOnFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="web-search"
          returnKeyType="go"
          placeholder="Adresse ou recherche"
          placeholderTextColor={colors.muted}
        />
        <Pressable hitSlop={8} onPress={() => (nav.loading ? web.current?.stopLoading() : web.current?.reload())}>
          <Ionicons name={nav.loading ? 'close' : 'refresh'} size={22} color={colors.text} />
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (isHome) return;
            Alert.alert("Page d'accueil", "Utiliser cette page comme page d'accueil du navigateur ?", [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Oui', onPress: () => updateSettings({ browserHome: nav.url }) },
            ]);
          }}
        >
          <Ionicons name={isHome ? 'star' : 'star-outline'} size={22} color={isHome ? colors.accent : colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => go(settings.browserHome)}>
          <Ionicons name="home-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {banner && (
        <Pressable style={styles.banner} onPress={() => setBanner(null)}>
          <Ionicons name="information-circle" size={18} color={colors.text} />
          <Text style={styles.bannerText}>{banner}</Text>
        </Pressable>
      )}

      <WebView
        ref={web}
        source={{ uri }}
        style={{ backgroundColor: colors.bg }}
        onNavigationStateChange={(s) =>
          setNav({ url: s.url, canGoBack: s.canGoBack, canGoForward: s.canGoForward, loading: s.loading })
        }
        // Fichier envoyé en "pièce jointe" par le serveur.
        onFileDownload={(e) => grab(e.nativeEvent.downloadUrl)}
        // Lien qui pointe directement vers un .mp3/.m4a : on le récupère au lieu de le lire dans la page.
        onShouldStartLoadWithRequest={(req) => {
          if (req.isTopFrame && looksLikeAudioUrl(req.url)) {
            grab(req.url);
            return false;
          }
          return true;
        }}
        // Bloque les pop-ups publicitaires ouverts automatiquement.
        javaScriptCanOpenWindowsAutomatically={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  url: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 15,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
});
