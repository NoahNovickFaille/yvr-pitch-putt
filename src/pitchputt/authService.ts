import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

import { authRedirectUrl, supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error };
  if (data?.url) {
    const browserResult = await WebBrowser.openAuthSessionAsync(
      data.url,
      authRedirectUrl,
    );
    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return { error: new Error('Google sign-in was cancelled.') };
    }
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) return { error: sessionError };
  const user = sessionData.session?.user;
  if (!user) {
    return {
      error: new Error('Google sign-in did not establish a session.'),
    };
  }
  return { data: { user }, error: null };
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
