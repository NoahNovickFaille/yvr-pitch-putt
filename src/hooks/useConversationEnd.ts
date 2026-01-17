import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Detects when app goes to background and calls onConversationEnd.
 * Used to mark conversation boundaries for memory extraction (Phase 3).
 */
export function useConversationEnd(onConversationEnd: () => void): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // App went from active to background/inactive
        if (
          appState.current === 'active' &&
          (nextAppState === 'background' || nextAppState === 'inactive')
        ) {
          console.log('[useConversationEnd] App going to background, marking conversation end');
          onConversationEnd();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [onConversationEnd]);
}
