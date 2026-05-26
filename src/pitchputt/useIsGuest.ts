import { useSessionStore } from "./store";

export function useIsGuest(): boolean {
  const userId = useSessionStore((state) => state.userId);
  return !userId || userId.startsWith("guest-");
}
