import { storage } from '../../storage/storage';
import { FollowUpCandidate, FollowUpStatus } from '../../types/memory';
import { FOLLOW_UP_EXPIRY_MS, FOLLOW_UP_MAX_PENDING } from '../../constants/memory';

const FOLLOW_UPS_KEY = 'follow_up_candidates';

/**
 * Persistent store for follow-up candidates.
 * All operations are synchronous (MMKV) and persist-before-state.
 */
class FollowUpStoreImpl {
  private candidates: FollowUpCandidate[] = [];
  private loaded = false;

  /** Load candidates from MMKV. Safe to call multiple times. */
  load(): void {
    if (this.loaded) return;
    const json = storage.getString(FOLLOW_UPS_KEY);
    this.candidates = json ? JSON.parse(json) : [];
    this.loaded = true;
    console.log('[FollowUpStore] Loaded', this.candidates.length, 'candidates');
  }

  private persist(): void {
    storage.set(FOLLOW_UPS_KEY, JSON.stringify(this.candidates));
  }

  /**
   * Add new follow-up candidates.
   * Deduplicates by sourceMessageId — if a candidate for the same user message
   * already exists (in any status), the new one is skipped.
   * Enforces FOLLOW_UP_MAX_PENDING limit (oldest pending dropped).
   */
  add(candidates: FollowUpCandidate[]): void {
    this.load();

    const existingSourceIds = new Set(this.candidates.map((c) => c.sourceMessageId));
    const newCandidates = candidates.filter((c) => !existingSourceIds.has(c.sourceMessageId));

    if (newCandidates.length === 0) return;

    this.candidates.push(...newCandidates);

    // Enforce max pending limit — drop oldest pending candidates
    const pending = this.candidates.filter((c) => c.status === 'pending');
    if (pending.length > FOLLOW_UP_MAX_PENDING) {
      // Sort pending by createdAt ascending, mark excess as expired
      pending.sort((a, b) => a.createdAt - b.createdAt);
      const excess = pending.slice(0, pending.length - FOLLOW_UP_MAX_PENDING);
      const excessIds = new Set(excess.map((c) => c.id));
      this.candidates = this.candidates.map((c) =>
        excessIds.has(c.id) ? { ...c, status: 'expired' as FollowUpStatus } : c
      );
    }

    this.persist();
    console.log('[FollowUpStore] Added', newCandidates.length, 'candidates');
  }

  /**
   * Get all pending candidates whose followUpAt is at or before the given time.
   */
  getDue(now: number = Date.now()): FollowUpCandidate[] {
    this.load();
    return this.candidates.filter(
      (c) => c.status === 'pending' && c.followUpAt <= now
    );
  }

  /**
   * Mark a candidate as delivered.
   */
  markDelivered(id: string, conversationId?: string): void {
    this.load();
    this.candidates = this.candidates.map((c) =>
      c.id === id
        ? { ...c, status: 'delivered' as FollowUpStatus, deliveredAt: Date.now(), conversationId }
        : c
    );
    this.persist();
    console.log('[FollowUpStore] Marked', id, 'as delivered');
  }

  /**
   * Expire candidates that are past the expiry window and still pending.
   * Also removes delivered/expired candidates older than the expiry window.
   */
  cleanup(now: number = Date.now()): void {
    this.load();
    const before = this.candidates.length;

    this.candidates = this.candidates
      .map((c) => {
        // Expire pending candidates past their window
        if (c.status === 'pending' && now - c.followUpAt > FOLLOW_UP_EXPIRY_MS) {
          return { ...c, status: 'expired' as FollowUpStatus };
        }
        return c;
      })
      // Remove expired/delivered candidates older than expiry window
      .filter((c) => {
        if (c.status === 'expired' || c.status === 'delivered') {
          return now - c.createdAt < FOLLOW_UP_EXPIRY_MS;
        }
        return true;
      });

    if (this.candidates.length !== before) {
      this.persist();
      console.log('[FollowUpStore] Cleanup removed', before - this.candidates.length, 'candidates');
    }
  }

  /** Get all candidates (for debugging). */
  getAll(): FollowUpCandidate[] {
    this.load();
    return [...this.candidates];
  }
}

export const FollowUpStore = new FollowUpStoreImpl();
