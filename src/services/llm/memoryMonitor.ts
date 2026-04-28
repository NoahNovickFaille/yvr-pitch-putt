import { AppState, AppStateStatus } from 'react-native';
import { LLMService } from './LLMService';

type MemoryWarningCallback = () => void;

/**
 * Set up iOS memory pressure monitoring.
 * When iOS sends a memory warning, we release the LLM context
 * to prevent the app from being terminated (jetsam).
 */
export function setupMemoryMonitor(
  onMemoryWarning?: MemoryWarningCallback
): () => void {
  // Listen for iOS memory warnings
  const subscription = AppState.addEventListener('memoryWarning', () => {
    console.log('[MemoryMonitor] Received iOS memory warning');

    // Release LLM context immediately
    LLMService.release();

    // Notify caller (for UI update)
    onMemoryWarning?.();
  });

  console.log('[MemoryMonitor] Memory pressure monitoring active');

  // Return cleanup function
  return () => {
    subscription.remove();
    console.log('[MemoryMonitor] Memory pressure monitoring stopped');
  };
}

/**
 * Optional: Track app state changes for debugging.
 * iOS may background the app before sending memory warning.
 */
export function setupAppStateMonitor(
  onBackground?: () => void,
  onForeground?: () => void
): () => void {
  let previousState: AppStateStatus = AppState.currentState;

  const subscription = AppState.addEventListener('change', (nextState) => {
    if (
      previousState === 'active' &&
      (nextState === 'background' || nextState === 'inactive')
    ) {
      console.log('[AppStateMonitor] App moved to background');
      onBackground?.();
    }

    if (
      (previousState === 'background' || previousState === 'inactive') &&
      nextState === 'active'
    ) {
      console.log('[AppStateMonitor] App moved to foreground');
      onForeground?.();
    }

    previousState = nextState;
  });

  return () => {
    subscription.remove();
  };
}
