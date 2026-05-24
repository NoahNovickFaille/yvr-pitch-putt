import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthRoundsHydration } from '@/src/pitchputt/AuthRoundsHydration';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthRoundsHydration />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="register" />
        <Stack.Screen name="logout" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player-setup" options={{ presentation: 'card' }} />
        <Stack.Screen name="membership-card" options={{ presentation: 'card' }} />
        <Stack.Screen name="hole" />
        <Stack.Screen
          name="hole-picker"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="final-scorecard" options={{ presentation: 'card' }} />
        <Stack.Screen name="claim" options={{ presentation: 'card' }} />
        <Stack.Screen name="history/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
