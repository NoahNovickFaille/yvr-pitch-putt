import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { supabase } from '@/src/lib/supabase';
import { clearPendingClaimToken } from '@/src/pitchputt/pendingClaim';
import { useSessionStore } from '@/src/pitchputt/store';

export default function Index() {
  const zustandUserId = useSessionStore((state) => state.userId);
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    clearPendingClaimToken();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session?.user));
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#2D6A4F" size="large" />
      </View>
    );
  }

  if (hasSession || (zustandUserId && !zustandUserId.startsWith('guest-'))) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center' },
});
