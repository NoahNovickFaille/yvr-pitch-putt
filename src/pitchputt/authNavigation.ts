import { router } from "expo-router";

import { clearPendingClaimToken, peekPendingClaimToken } from "./pendingClaim";
import { waitForAuthedUserId } from "./roundsRemote";
import { useRoundsStore } from "./store";

/** Wait for JWT, hydrate rounds, then return to a pending claim or home. */
export async function finishAuthAndNavigate(expectedUserId: string): Promise<void> {
  const authedUserId = await waitForAuthedUserId(expectedUserId);
  if (!authedUserId) {
    console.warn("[auth] Supabase session not ready after sign-in");
  }

  await useRoundsStore.getState().hydrateRoundsFromDatabase();

  const pendingToken = await peekPendingClaimToken();
  if (pendingToken) {
    await clearPendingClaimToken();
    router.replace({ pathname: "/claim", params: { token: pendingToken } });
    return;
  }

  router.replace("/(tabs)");
}
