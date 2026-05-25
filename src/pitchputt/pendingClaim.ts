import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_CLAIM_TOKEN_KEY = "pitchputt.pendingClaimToken";

export async function setPendingClaimToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_CLAIM_TOKEN_KEY, token);
  } catch {
    /* best-effort; claim screen still has token in URL when possible */
  }
}

export async function peekPendingClaimToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_CLAIM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingClaimToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_CLAIM_TOKEN_KEY);
  } catch {
    /* noop */
  }
}
