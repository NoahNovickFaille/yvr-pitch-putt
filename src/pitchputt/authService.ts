import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { authRedirectUrl, supabase } from '@/src/lib/supabase';

const extra = Constants.expoConfig?.extra ?? {};

GoogleSignin.configure({
  webClientId: extra.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: extra.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
});

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl,
  });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string },
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authRedirectUrl,
      data: {
        first_name: profile?.firstName ?? '',
        last_name: profile?.lastName ?? '',
      },
    },
  });
}

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { error: new Error('Google sign-in was cancelled.') };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return { error: new Error('Google sign-in did not return an ID token.') };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { error };
    if (!data.user) {
      return { error: new Error('Google sign-in did not establish a session.') };
    }
    return { data: { user: data.user }, error: null };
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return { error: new Error('Google sign-in was cancelled.') };
    }
    if (error?.code === statusCodes.IN_PROGRESS) {
      return { error: new Error('Google sign-in already in progress.') };
    }
    return { error: error instanceof Error ? error : new Error('Google sign-in failed.') };
  }
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    return { error: new Error('Apple identity token was not returned.') };
  }

  return supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
}
