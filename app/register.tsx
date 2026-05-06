import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUpWithEmail } from '@/src/pitchputt/authService';
import { useRoundsStore, useSessionStore } from '@/src/pitchputt/store';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  const setSession = useSessionStore((state) => state.setSession);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState(params.password ?? '');
  const isEmailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);

  const disabled = useMemo(
    () =>
      firstName.trim().length === 0 ||
      lastName.trim().length === 0 ||
      !isEmailValid ||
      !isPasswordValid,
    [firstName, lastName, isEmailValid, isPasswordValid],
  );

  const createAccount = async () => {
    if (!isEmailValid) {
      Alert.alert('Invalid email', 'Please enter a valid email address (example: name@email.com).');
      return;
    }
    if (!isPasswordValid) {
      Alert.alert('Invalid password', 'Password must be at least 8 characters long.');
      return;
    }
    if (firstName.trim().length === 0 || lastName.trim().length === 0) {
      Alert.alert('Missing details', 'Please enter your first and last name.');
      return;
    }

    try {
      const result = await signUpWithEmail(email, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.error) {
        throw result.error;
      }
      const sessionUser = result.data.session?.user ?? result.data.user;
      if (!sessionUser?.id) {
        Alert.alert(
          'Check your email',
          'If we sent a confirmation link, open it to finish creating your account. You can sign in after that.',
        );
        return;
      }
      setSession(sessionUser.id, email, firstName.trim());
      void useRoundsStore.getState().hydrateRoundsFromDatabase();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed. Please try again.';
      Alert.alert('Sign up failed', message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
          accessibilityLabel="Pitch and Putt YVR"
        />
        <Text style={styles.appName}>Create Account</Text>
        <Text style={styles.appTagline}>Set up your Pitch & Putt YVR profile</Text>

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#aaaaaa"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#aaaaaa"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaaaaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaaaaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={[styles.passwordHint, isPasswordValid ? styles.passwordHintValid : styles.passwordHintInvalid]}>
          {'\u2022'} Password must be at least 8 characters long
        </Text>

        <Pressable style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]} onPress={() => void createAccount()}>
          <Text style={styles.primaryBtnText}>Create account</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: {
    flex: 1,
    margin: 16,
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignSelf: 'center',
    marginBottom: 2,
  },
  appName: { color: '#1a1a1a', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  appTagline: { color: '#6b6b6b', textAlign: 'center', marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    color: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  passwordHint: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 2,
    fontWeight: '500',
  },
  passwordHintInvalid: { color: '#6b6b6b' },
  passwordHintValid: { color: '#2D6A4F' },
  link: {
    color: '#2D5A8E',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
});
