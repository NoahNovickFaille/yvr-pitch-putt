import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player-setup" options={{ presentation: 'card' }} />
        <Stack.Screen name="hole" />
        <Stack.Screen name="hole-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="final-scorecard" options={{ presentation: 'card' }} />
        <Stack.Screen name="history/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
