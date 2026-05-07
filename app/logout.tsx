import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/src/lib/supabase';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

export default function LogoutScreen() {
  const clearSession = useSessionStore((state) => state.clearSession);
  const clearRounds = useRoundsStore((state) => state.clearRounds);

  useEffect(() => {
    let isMounted = true;

    const runLogout = async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        // Always clear local user data on logout to prevent cross-session leakage.
        clearSession();
        clearRounds();
      }
      if (isMounted) {
        router.replace('/auth');
      }
    };

    void runLogout();

    return () => {
      isMounted = false;
    };
  }, [clearRounds, clearSession]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#2D6A4F" />
        <Text style={styles.text}>Signing you out...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
});
