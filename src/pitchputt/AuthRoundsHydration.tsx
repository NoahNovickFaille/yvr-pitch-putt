import { useEffect } from "react";

import { supabase } from "@/src/lib/supabase";

import { isSupabaseAuthUserId } from "./sessionUtils";
import { useRoundsStore, useSessionStore } from "./store";

function displayNameFromUserMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) return null;
  const first = metadata.first_name;
  if (typeof first === "string" && first.trim().length > 0) {
    return first.trim();
  }
  const full = metadata.full_name;
  if (typeof full === "string" && full.trim().length > 0) {
    return full.trim();
  }
  return null;
}

async function syncLocalSessionFromSupabase(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  const { userId, setSession, clearSession } = useSessionStore.getState();

  if (user?.id) {
    if (userId !== user.id) {
      setSession(
        user.id,
        user.email ?? "",
        displayNameFromUserMetadata(user.user_metadata),
      );
    }
    return;
  }

  if (isSupabaseAuthUserId(userId)) {
    clearSession();
  }
}

/**
 * Keeps local rounds in sync with Supabase for signed-in users (cold start + sign-in).
 * Restores the Zustand session from the persisted Supabase JWT when the app reopens.
 */
export function AuthRoundsHydration() {
  useEffect(() => {
    void syncLocalSessionFromSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      void syncLocalSessionFromSupabase();
      if (event === "TOKEN_REFRESHED") return;
      void useRoundsStore.getState().hydrateRoundsFromDatabase();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
