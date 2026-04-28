import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { signInWithApple, signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/src/pitchputt/authService';
import { useSessionStore } from '@/src/pitchputt/store';

export default function AuthScreen() {
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const disabled = useMemo(() => !email.includes('@') || password.length < 6, [email, password]);

  const continueWithProvider = async (provider: 'apple' | 'google' | 'email') => {
    if (provider === 'email' && disabled) {
      Alert.alert('Invalid details', 'Enter a valid email and a password at least 6 characters long.');
      return;
    }

    try {
      if (provider === 'email') {
        const signInResult = await signInWithEmail(email, password);
        if (signInResult.error) {
          const signUpResult = await signUpWithEmail(email, password);
          if (signUpResult.error) {
            throw signUpResult.error;
          }
        }
        setSession(`supabase-email-${Date.now()}`, email);
      } else if (provider === 'google') {
        const result = await signInWithGoogle();
        if (result.error) {
          throw result.error;
        }
        setSession(`supabase-google-${Date.now()}`, `${provider}@example.com`);
      } else {
        const result = await signInWithApple();
        if (result.error) {
          throw result.error;
        }
        setSession(`supabase-apple-${Date.now()}`, `${provider}@example.com`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider auth failed, using local fallback.';
      Alert.alert('Auth fallback', message);
      const fallbackEmail = provider === 'email' ? email : `${provider}@example.com`;
      setSession(`local-${provider}`, fallbackEmail);
    }

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Pitch & Putt YVR</Text>
        <Text style={styles.subtitle}>Sign in to track rounds, history, and stats.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.primaryBtn} onPress={() => void continueWithProvider('email')}>
          <Text style={styles.primaryBtnText}>Continue with email</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => void continueWithProvider('apple')}>
          <Text style={styles.secondaryBtnText}>Continue with Apple</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => void continueWithProvider('google')}>
          <Text style={styles.secondaryBtnText}>Continue with Google</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#030712' },
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  title: { color: 'white', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#9ca3af', marginBottom: 8 },
  input: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderWidth: 1,
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#022c22', fontWeight: '700' },
  secondaryBtn: { borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: 'white', fontWeight: '600' },
});
