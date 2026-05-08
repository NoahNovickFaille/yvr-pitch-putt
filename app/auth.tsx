import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "@/src/pitchputt/authService";
import { useRoundsStore, useSessionStore } from "@/src/pitchputt/store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const passwordInputRef = useRef<TextInput>(null);
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEmailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const disabled = useMemo(
    () => !isEmailValid || password.length === 0,
    [isEmailValid, password],
  );

  const continueWithProvider = async (
    provider: "apple" | "google" | "email",
  ) => {
    setErrorMessage(null);
    if (provider === "email" && !isEmailValid) {
      const message =
        "Please enter a valid email address (example: name@email.com).";
      setErrorMessage(message);
      Alert.alert("Invalid details", message);
      return;
    }
    if (provider === "email" && password.length === 0) {
      const message = "Please enter your password.";
      setErrorMessage(message);
      Alert.alert("Invalid details", message);
      return;
    }

    setIsSubmitting(true);
    try {
      if (provider === "email") {
        const signInResult = await signInWithEmail(email, password);
        if (signInResult.error) {
          throw signInResult.error;
        }
        const metadataFirstName =
          signInResult.data.user?.user_metadata?.first_name;
        const firstNameFromMetadata =
          typeof metadataFirstName === "string" &&
          metadataFirstName.trim().length > 0
            ? metadataFirstName.trim()
            : null;
        const emailName = email.split("@")[0]?.trim() ?? "";
        const normalizedEmailName = emailName
          ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
          : null;
        const normalizedName = firstNameFromMetadata ?? normalizedEmailName;
        const user = signInResult.data.user;
        if (!user?.id) {
          throw new Error("Sign in did not return a user.");
        }
        setSession(user.id, user.email ?? email, normalizedName);
      } else if (provider === "google") {
        const result = await signInWithGoogle();
        if (result.error) {
          throw result.error;
        }
        const user = result.data?.user;
        if (!user?.id) {
          throw new Error("Google sign-in did not return a user.");
        }
        const metaName = user.user_metadata?.full_name;
        const displayName =
          typeof metaName === "string" && metaName.trim().length > 0
            ? metaName.trim()
            : "Google user";
        setSession(user.id, user.email ?? "", displayName);
      } else {
        const result = await signInWithApple();
        if (result.error) {
          throw result.error;
        }
        const user = result.data?.user;
        if (!user?.id) {
          throw new Error("Apple sign in did not return a user.");
        }
        const given =
          user.user_metadata?.first_name ?? user.user_metadata?.full_name;
        const displayName =
          typeof given === "string" && given.trim().length > 0
            ? given.trim()
            : "Apple user";
        setSession(
          user.id,
          user.email ?? "",
          displayName,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign in failed. Please try again.";
      setErrorMessage(message);
      Alert.alert("Sign in failed", message);
      return;
    } finally {
      setIsSubmitting(false);
    }

    void useRoundsStore.getState().hydrateRoundsFromDatabase();
    router.replace("/(tabs)");
  };

  const continueAsGuest = () => {
    setErrorMessage(null);
    // Local-only session (no Supabase user). Rounds use this id as ownerId until the user signs in.
    setSession(`guest-${Date.now()}`, "", "Guest");
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logoImage}
          resizeMode="cover"
          accessibilityLabel="Pitch and Putt YVR"
        />
        <Text style={styles.appName}>Pitch & Putt YVR</Text>
        <Text style={styles.appTagline}>Vancouver&apos;s courses, tracked</Text>

        <Pressable
          style={styles.authBtn}
          onPress={() => void continueWithProvider("google")}
        >
          <View style={[styles.authIcon, styles.googleIcon]}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
          <Text style={styles.authBtnText}>Continue with Google</Text>
        </Pressable>

        <Pressable
          style={styles.authBtn}
          onPress={() => void continueWithProvider("apple")}
        >
          <View style={[styles.authIcon, styles.appleIcon]}>
            <Text style={styles.appleIconText}></Text>
          </View>
          <Text style={styles.authBtnText}>Continue with Apple</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaaaaa"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />
        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaaaaa"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          secureTextEntry
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void continueWithProvider("email")}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          style={[
            styles.primaryBtn,
            (disabled || isSubmitting) && styles.primaryBtnDisabled,
          ]}
          onPress={() => void continueWithProvider("email")}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push({ pathname: "/register", params: { email, password } })
          }
        >
          <Text style={styles.signupLink}>New here? Create an account</Text>
        </Pressable>

        <Pressable
          style={styles.guestBtn}
          onPress={continueAsGuest}
          accessibilityRole="button"
          accessibilityLabel="Continue as guest"
        >
          <Text style={styles.guestBtnText}>Continue as guest</Text>
          <Text style={styles.guestCaption}>
            Scores stay on this device until you create an account or sign in.
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f6f2" },
  container: {
    flex: 1,
    margin: 16,
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "flex-start",
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignSelf: "center",
    marginBottom: 2,
  },
  appName: {
    color: "#1a1a1a",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  appTagline: {
    color: "#6b6b6b",
    textAlign: "center",
    marginBottom: 8,
    fontSize: 14,
  },
  authBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
  },
  authBtnText: { color: "#1a1a1a", fontSize: 15, fontWeight: "600" },
  authIcon: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  googleIcon: { backgroundColor: "#e8f0f9" },
  googleIconText: { color: "#2D5A8E", fontWeight: "700", fontSize: 13 },
  appleIcon: { backgroundColor: "#111", borderRadius: 3 },
  appleIconText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  dividerText: { color: "#aaaaaa", fontSize: 13 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.1)",
    borderWidth: 1,
    color: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: "#2D6A4F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  errorText: {
    color: "#B85C38",
    backgroundColor: "#faeae3",
    borderColor: "rgba(184,92,56,0.25)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
  },
  signupLink: {
    color: "#2D5A8E",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 4,
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
    gap: 4,
  },
  guestBtnText: { color: "#1a1a1a", fontWeight: "600", fontSize: 15 },
  guestCaption: {
    color: "#6b6b6b",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 16,
  },
});
