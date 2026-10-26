import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LibraryProvider } from '../lib/library';
import { PlayerProvider } from '../lib/player';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <PlayerProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
              headerBackTitle: 'Retour',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="playlist/[id]" options={{ title: '' }} />
            <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="pick-tracks" options={{ presentation: 'modal', title: 'Ajouter des morceaux' }} />
          </Stack>
        </PlayerProvider>
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
