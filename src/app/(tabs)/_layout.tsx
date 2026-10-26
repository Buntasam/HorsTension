import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';

import { MiniPlayer } from '../../components/MiniPlayer';
import { colors } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View style={{ backgroundColor: colors.bg }}>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bibliothèque', tabBarIcon: icon('musical-notes') }} />
      <Tabs.Screen name="playlists" options={{ title: 'Playlists', tabBarIcon: icon('list') }} />
      <Tabs.Screen name="add" options={{ title: 'Ajouter', tabBarIcon: icon('add-circle') }} />
      <Tabs.Screen name="browser" options={{ title: 'Navigateur', headerShown: false, tabBarIcon: icon('globe') }} />
    </Tabs>
  );
}
