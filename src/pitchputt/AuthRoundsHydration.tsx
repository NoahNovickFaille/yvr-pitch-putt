import { useEffect } from "react";

import { supabase } from "@/src/lib/supabase";

import { useRoundsStore } from "./store";

/**
 * Keeps local rounds in sync with Supabase for signed-in users (cold start + sign-in).
 * Skips token refresh noise; `hydrateRoundsFromDatabase` no-ops when there is no session.
 */
export function AuthRoundsHydration() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      void useRoundsStore.getState().hydrateRoundsFromDatabase();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
