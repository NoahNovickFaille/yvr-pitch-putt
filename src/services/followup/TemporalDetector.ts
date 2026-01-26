import { startOfDay, addDays, addWeeks, addMonths, nextDay, type Day } from 'date-fns';
import { FollowUpCandidate, generateFollowUpId } from '../../types/memory';
import { FOLLOW_UP_MIN_HOURS_AHEAD } from '../../constants/memory';

/**
 * Temporal pattern definition used by the detector.
 * Each entry has a regex (tested case-insensitively against memory content)
 * and a resolver that maps the match to a target Date.
 */
interface TemporalRule {
  label: string;
  pattern: RegExp;
  resolve: (match: RegExpMatchArray, ref: Date) => Date | null;
}

/** Map day-name strings to JS weekday index (0=Sun … 6=Sat). */
const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

// ── temporal rules ─────────────────────────────────────

const TEMPORAL_RULES: TemporalRule[] = [
  // "tomorrow" / "tomorrow morning/afternoon/evening"
  {
    label: 'tomorrow',
    pattern: /\btomorrow\b/i,
    resolve: (_m, ref) => {
      return addDays(startOfDay(ref), 1);
    },
  },
  // "tonight" — follow up the NEXT MORNING to ask how it went
  {
    label: 'tonight',
    pattern: /\btonight\b/i,
    resolve: (_m, ref) => {
      const nextMorning = addDays(startOfDay(ref), 1);
      nextMorning.setHours(9, 0, 0, 0);
      return nextMorning;
    },
  },
  // "this weekend"
  {
    label: 'this weekend',
    pattern: /\bthis weekend\b/i,
    resolve: (_m, ref) => {
      // Follow up on Monday after the weekend
      // nextDay gives us the next Saturday (6), then add 2 days for Monday
      const saturday = nextDay(startOfDay(ref), 6 as Day);
      return addDays(saturday, 2);
    },
  },
  // "next week"
  {
    label: 'next week',
    pattern: /\bnext week\b/i,
    resolve: (_m, ref) => {
      return addWeeks(startOfDay(ref), 1);
    },
  },
  // "next month"
  {
    label: 'next month',
    pattern: /\bnext month\b/i,
    resolve: (_m, ref) => {
      return addMonths(startOfDay(ref), 1);
    },
  },
  // "in N days/day"
  {
    label: 'in N days',
    pattern: /\bin (\d+) days?\b/i,
    resolve: (m, ref) => {
      const days = parseInt(m[1], 10);
      if (days <= 0 || days > 60) return null;
      return addDays(startOfDay(ref), days);
    },
  },
  // "in a couple days" / "in a few days"
  {
    label: 'in a couple/few days',
    pattern: /\bin (?:a couple(?: of)?|a few) days\b/i,
    resolve: (_m, ref) => {
      return addDays(startOfDay(ref), 3);
    },
  },
  // "in N weeks/week"
  {
    label: 'in N weeks',
    pattern: /\bin (\d+) weeks?\b/i,
    resolve: (m, ref) => {
      const weeks = parseInt(m[1], 10);
      if (weeks <= 0 || weeks > 8) return null;
      return addWeeks(startOfDay(ref), weeks);
    },
  },
  // Named days: "on Monday", "this Tuesday", "next Friday", or just "Monday"
  {
    label: 'named day',
    pattern: /\b(?:on |this |next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i,
    resolve: (m, ref) => {
      const dayStr = m[1].toLowerCase();
      const targetDay = DAY_MAP[dayStr];
      if (targetDay === undefined) return null;
      const isNext = m[0].toLowerCase().startsWith('next');
      // nextDay from date-fns returns the next occurrence of the given weekday
      const d = nextDay(startOfDay(ref), targetDay as Day);
      if (isNext) {
        // "next Friday" means the one after the upcoming one
        return addDays(d, 7);
      }
      return d;
    },
  },
  // "today" / "this morning" / "this afternoon" / "this evening" / "later today"
  {
    label: 'today',
    pattern: /\b(?:today|this (?:morning|afternoon|evening)|later today)\b/i,
    resolve: (_m, ref) => {
      // Follow up tomorrow
      return addDays(startOfDay(ref), 1);
    },
  },
];

// ── topic extraction ───────────────────────────────────

/**
 * Extract a short topic phrase from memory content.
 * Strips the temporal reference and common filler, keeping the core subject.
 *
 * Example: "has a job interview tomorrow" → "job interview"
 */
function extractTopic(content: string): string {
  let topic = content;

  // Remove temporal phrases
  for (const rule of TEMPORAL_RULES) {
    topic = topic.replace(rule.pattern, '');
  }

  // Remove common lead-ins
  topic = topic
    .replace(/\b(has|have|had|is|are|was|were|will be|going to|gonna|planning to|plans to|needs to|need to)\s+(a |an |the )?/gi, '')
    .replace(/\b(mentioned|said|told|talked about|shared)\s+(a |an |the |that )?/gi, '')
    .replace(/^(a |an |the |their |his |her |my )/i, '')
    .trim();

  // Remove trailing/leading punctuation and whitespace
  topic = topic.replace(/^[\s,.\-:;]+|[\s,.\-:;]+$/g, '');

  // Truncate to reasonable length
  if (topic.length > 60) {
    topic = topic.substring(0, 57) + '...';
  }

  return topic || content.substring(0, 40);
}

// ── public API ─────────────────────────────────────────

/**
 * Scan an array of newly extracted memories for temporal references.
 * Returns follow-up candidates with resolved target dates.
 *
 * Only creates candidates where the target date is at least
 * FOLLOW_UP_MIN_HOURS_AHEAD from now.
 */
export function detectTemporalReferences(
  memories: { id: string; content: string }[],
  referenceDate: Date = new Date()
): FollowUpCandidate[] {
  const candidates: FollowUpCandidate[] = [];
  const minTimestamp = referenceDate.getTime() + FOLLOW_UP_MIN_HOURS_AHEAD * 60 * 60 * 1000;

  for (const memory of memories) {
    for (const rule of TEMPORAL_RULES) {
      const match = memory.content.match(rule.pattern);
      if (!match) continue;

      const targetDate = rule.resolve(match, referenceDate);
      if (!targetDate) continue;

      // Skip if target is too soon
      if (targetDate.getTime() < minTimestamp) continue;

      candidates.push({
        id: generateFollowUpId(),
        memoryId: memory.id,
        memoryContent: memory.content,
        topic: extractTopic(memory.content),
        followUpAt: targetDate.getTime(),
        createdAt: referenceDate.getTime(),
        status: 'pending',
      });

      // One candidate per memory — take the first temporal match
      break;
    }
  }

  return candidates;
}
