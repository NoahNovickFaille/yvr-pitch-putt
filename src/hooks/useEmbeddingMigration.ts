import { useState, useEffect, useCallback } from 'react';
import { EmbeddingMigration } from '../services/embedding/EmbeddingMigration';
import type { MigrationProgress } from '../types/embedding';

/**
 * Hook return type for embedding migration state.
 */
interface UseEmbeddingMigrationReturn {
  /** Current migration progress */
  progress: MigrationProgress;
  /** Start the migration process */
  startMigration: () => Promise<void>;
  /** Whether migration is needed (memories exist without embeddings) */
  isMigrationNeeded: boolean;
  /** Completion percentage (0-100) */
  percentComplete: number;
}

/**
 * React hook for tracking embedding migration state.
 *
 * Provides reactive access to migration progress and a trigger to start migration.
 * Can be used to show subtle migration progress in UI or run silently in background.
 *
 * @example
 * ```tsx
 * function MigrationStatus() {
 *   const { progress, percentComplete, isMigrationNeeded, startMigration } = useEmbeddingMigration();
 *
 *   useEffect(() => {
 *     if (isMigrationNeeded) {
 *       startMigration();
 *     }
 *   }, [isMigrationNeeded, startMigration]);
 *
 *   if (progress.status === 'running') {
 *     return <Text>Upgrading memories... {percentComplete}%</Text>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useEmbeddingMigration(): UseEmbeddingMigrationReturn {
  const [progress, setProgress] = useState<MigrationProgress>(
    EmbeddingMigration.getProgress()
  );
  const [isMigrationNeeded, setIsMigrationNeeded] = useState(false);

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = EmbeddingMigration.subscribe(setProgress);

    // Check if migration is needed
    setIsMigrationNeeded(EmbeddingMigration.isMigrationNeeded());

    return unsubscribe;
  }, []);

  const startMigration = useCallback(async () => {
    await EmbeddingMigration.startMigration();
  }, []);

  const percentComplete =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return {
    progress,
    startMigration,
    isMigrationNeeded,
    percentComplete,
  };
}
