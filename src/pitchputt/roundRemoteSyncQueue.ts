/**
 * Serializes cloud score uploads per round so saves never race or get dropped
 * when the UI navigates before the network finishes.
 */

const tailByRoundId = new Map<string, Promise<void>>();

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

async function runWithRetry(task: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      await task();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_MS * (attempt + 1)),
        );
      }
    }
  }
  console.warn("[roundRemoteSyncQueue] sync failed after retries", lastError);
}

function enqueue(roundId: string, task: () => Promise<void>): void {
  const previous = tailByRoundId.get(roundId) ?? Promise.resolve();
  const next = previous
    .then(() => runWithRetry(task))
    .catch(() => {
      /* runWithRetry already logged; keep the chain alive for later jobs */
    });
  tailByRoundId.set(roundId, next);
}

export function enqueueHoleScoresSync(
  roundId: string,
  holeNumber: number,
  syncHole: (roundId: string, holeNumber: number) => Promise<void>,
): void {
  enqueue(roundId, () => syncHole(roundId, holeNumber));
}

export function enqueueRoundScoresSync(
  roundId: string,
  syncRound: (roundId: string) => Promise<void>,
): void {
  enqueue(roundId, () => syncRound(roundId));
}
