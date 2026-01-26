import { FollowUpCandidate } from '../../types/memory';
import { FollowUpStore } from './FollowUpStore';

/**
 * Retrieve and prioritize due follow-up candidates.
 *
 * Priority scoring:
 * - More recent followUpAt gets higher score (closer to "just due")
 * - Shorter topic → more specific → higher weight
 */
function scoreCandidates(candidates: FollowUpCandidate[], now: number): FollowUpCandidate[] {
  if (candidates.length <= 1) return candidates;

  const scored = candidates.map((c) => {
    // Recency: prefer candidates whose target date is closest to now
    // Normalize: 0–1 where 1 = just became due, 0 = due a week ago
    const hoursSinceDue = (now - c.followUpAt) / (60 * 60 * 1000);
    const recencyScore = Math.max(0, 1 - hoursSinceDue / 168); // 168h = 1 week

    // Specificity: shorter topics are usually more specific
    const specificityScore = Math.max(0, 1 - c.topic.length / 60);

    const score = recencyScore * 0.7 + specificityScore * 0.3;
    return { candidate: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.candidate);
}

/**
 * Get the best follow-up candidate that is currently due.
 * Returns null if no follow-ups are due.
 *
 * Also runs cleanup to expire stale candidates.
 */
export function getBestDueFollowUp(now: number = Date.now()): FollowUpCandidate | null {
  // Cleanup expired candidates first
  FollowUpStore.cleanup(now);

  const due = FollowUpStore.getDue(now);
  if (due.length === 0) return null;

  const ranked = scoreCandidates(due, now);
  return ranked[0];
}

/**
 * Mark a follow-up as delivered so it won't repeat.
 */
export function markFollowUpDelivered(id: string, conversationId?: string): void {
  FollowUpStore.markDelivered(id, conversationId);
}
