/**
 * Serializes cloud score uploads per round. Coalesces rapid saves on the same
 * or different holes so each drain reads the latest local scores.
 */

const tailByRoundId = new Map<string, Promise<void>>();
const pendingHolesByRoundId = new Map<string, Set<number>>();

type HoleWaiter = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

const waitersByRoundHole = new Map<string, HoleWaiter[]>();

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

function waiterKey(roundId: string, holeNumber: number): string {
  return `${roundId}:${holeNumber}`;
}

function settleHoleWaiters(
  roundId: string,
  holeNumber: number,
  error?: unknown,
): void {
  const key = waiterKey(roundId, holeNumber);
  const waiters = waitersByRoundHole.get(key);
  if (!waiters?.length) return;
  waitersByRoundHole.delete(key);
  for (const waiter of waiters) {
    if (error) {
      waiter.reject(error);
    } else {
      waiter.resolve();
    }
  }
}

function waitForHoleSync(roundId: string, holeNumber: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const key = waiterKey(roundId, holeNumber);
    const list = waitersByRoundHole.get(key) ?? [];
    list.push({ resolve, reject });
    waitersByRoundHole.set(key, list);
  });
}

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
  throw lastError;
}

async function drainRound(
  roundId: string,
  syncHole: (roundId: string, holeNumber: number) => Promise<void>,
): Promise<void> {
  const pending = pendingHolesByRoundId.get(roundId);
  if (!pending?.size) return;

  const holeNumbers = [...pending].sort((a, b) => a - b);
  for (const holeNumber of holeNumbers) {
    pending.delete(holeNumber);
  }

  for (const holeNumber of holeNumbers) {
    try {
      await runWithRetry(() => syncHole(roundId, holeNumber));
      settleHoleWaiters(roundId, holeNumber);
    } catch (error) {
      console.warn(
        `[roundRemoteSyncQueue] hole sync failed round=${roundId} hole=${holeNumber}`,
        error,
      );
      pending.add(holeNumber);
      settleHoleWaiters(roundId, holeNumber, error);
    }
  }

  if (pending.size > 0) {
    await drainRound(roundId, syncHole);
  }
}

function enqueue(roundId: string, task: () => Promise<void>): void {
  const previous = tailByRoundId.get(roundId) ?? Promise.resolve();
  const next = previous.then(task).catch((error) => {
    console.warn("[roundRemoteSyncQueue] drain failed", error);
  });
  tailByRoundId.set(roundId, next);
}

/** Queues a hole upload and resolves when that hole has finished syncing (or no-ops). */
export function enqueueHoleScoresSync(
  roundId: string,
  holeNumber: number,
  syncHole: (roundId: string, holeNumber: number) => Promise<void>,
): Promise<void> {
  let pending = pendingHolesByRoundId.get(roundId);
  if (!pending) {
    pending = new Set();
    pendingHolesByRoundId.set(roundId, pending);
  }
  pending.add(holeNumber);

  const whenDone = waitForHoleSync(roundId, holeNumber);
  enqueue(roundId, () => drainRound(roundId, syncHole));
  return whenDone;
}
