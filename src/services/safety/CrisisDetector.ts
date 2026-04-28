/**
 * Crisis Detector
 *
 * Scans user messages for crisis language BEFORE sending to the model.
 * This is a safety-critical feature - false negatives (missing a crisis) are worse
 * than false positives (showing modal when not needed).
 *
 * Design:
 * 1. Normalize message (lowercase, trim)
 * 2. Check for negation patterns BEFORE phrase matching
 * 3. Scan for high-severity phrases (any match = high severity unless negated)
 * 4. Scan for medium-severity phrases (2+ matches = medium severity)
 * 5. Return result with matched phrases for debugging
 */

import {
  HIGH_SEVERITY_PHRASES,
  MEDIUM_SEVERITY_PHRASES,
  NEGATION_PATTERNS,
} from './crisisKeywords';

export interface CrisisResult {
  detected: boolean;
  matchedPhrases: string[];
  severity: 'low' | 'medium' | 'high';
}

/**
 * Detect crisis language in user message
 *
 * @param message - User's message text
 * @returns CrisisResult with detection status, matched phrases, and severity
 *
 * @example
 * ```typescript
 * const result = detectCrisis('I want to kill myself');
 * // { detected: true, matchedPhrases: ['kill myself'], severity: 'high' }
 *
 * const result2 = detectCrisis("I don't want to die");
 * // { detected: false, matchedPhrases: [], severity: 'low' }
 *
 * const result3 = detectCrisis('feeling hopeless and worthless');
 * // { detected: true, matchedPhrases: ['hopeless', 'worthless'], severity: 'medium' }
 * ```
 */
export function detectCrisis(message: string): CrisisResult {
  // Handle empty or very short messages
  if (!message || message.trim().length < 3) {
    return {
      detected: false,
      matchedPhrases: [],
      severity: 'low',
    };
  }

  // Normalize message for case-insensitive matching
  const normalized = message.toLowerCase().trim();

  const matchedHigh: string[] = [];
  const matchedMedium: string[] = [];

  // Scan for high-severity phrases
  for (const phrase of HIGH_SEVERITY_PHRASES) {
    if (normalized.includes(phrase)) {
      // Check if phrase is negated
      const phraseIndex = normalized.indexOf(phrase);
      const precedingText = normalized.substring(
        Math.max(0, phraseIndex - 15),
        phraseIndex
      );

      // If negation pattern appears within 15 characters before phrase, demote severity
      const isNegated = NEGATION_PATTERNS.some((negation) =>
        precedingText.includes(negation)
      );

      if (isNegated) {
        // Demote from high to medium
        matchedMedium.push(phrase);
      } else {
        matchedHigh.push(phrase);
      }
    }
  }

  // Scan for medium-severity phrases
  for (const phrase of MEDIUM_SEVERITY_PHRASES) {
    if (normalized.includes(phrase)) {
      matchedMedium.push(phrase);
    }
  }

  // Determine severity and detection status
  if (matchedHigh.length > 0) {
    // Any high-severity match (that wasn't negated) triggers high severity
    console.log('[CrisisDetector] High severity detected:', matchedHigh);
    return {
      detected: true,
      matchedPhrases: matchedHigh,
      severity: 'high',
    };
  }

  if (matchedMedium.length >= 2) {
    // 2+ medium-severity matches trigger medium severity
    console.log('[CrisisDetector] Medium severity detected:', matchedMedium);
    return {
      detected: true,
      matchedPhrases: matchedMedium,
      severity: 'medium',
    };
  }

  // No crisis detected
  return {
    detected: false,
    matchedPhrases: [],
    severity: 'low',
  };
}
