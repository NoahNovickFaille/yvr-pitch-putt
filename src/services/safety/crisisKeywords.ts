/**
 * Crisis Keyword Lists
 *
 * Research-based phrases for detecting crisis language in user messages.
 *
 * Sources:
 * - Crisis Text Line conversation patterns (2020-2024)
 * - Stanford HAI crisis detection research
 * - NIH mental health NLP studies (PMC9859480)
 *
 * Design philosophy:
 * - Phrase-based matching (not single words) to reduce false positives
 * - Severity tiers: high (always trigger), medium (multiple needed)
 * - Negation patterns to handle "I don't want to die" vs "I want to die"
 */

/**
 * HIGH SEVERITY PHRASES
 *
 * These phrases indicate immediate, severe crisis ideation.
 * ANY single match triggers crisis modal (unless clearly negated).
 *
 * Includes:
 * - Direct suicidal statements
 * - Hopelessness about living
 * - Self-harm intent
 * - Variations with contractions
 */
export const HIGH_SEVERITY_PHRASES = [
  // Direct suicidal statements
  'kill myself',
  'want to die',
  'end my life',
  'suicide',
  'take my own life',
  'ending it all',

  // Hopelessness about living
  'no reason to live',
  'better off dead',
  'not worth living',

  // Self-harm intent
  'hurt myself',
  'harm myself',

  // Contractions (common in natural speech)
  "don't want to be here",
  "can't go on",
  'cant go on',
  'dont want to be here',
];

/**
 * MEDIUM SEVERITY PHRASES
 *
 * These phrases indicate emotional distress that warrants attention.
 * Requires 2+ matches to trigger modal (prevents single-word false positives).
 *
 * Includes:
 * - Emotional distress markers
 * - Burden statements
 * - Giving up language
 */
export const MEDIUM_SEVERITY_PHRASES = [
  // Emotional distress
  'hopeless',
  'worthless',
  'trapped',

  // Burden statements
  'burden to everyone',
  'burden on everyone',

  // Giving up language
  'no way out',
  'giving up',
  "can't take it anymore",
  'cant take it anymore',
  "what's the point",
  'whats the point',
];

/**
 * NEGATION PATTERNS
 *
 * These patterns, when appearing BEFORE crisis phrases, reduce severity.
 * Used to handle: "I don't want to die" (negated) vs "I want to die" (not negated)
 *
 * Simple heuristic: if negation appears within 10 characters before crisis phrase,
 * demote severity from high → medium, or medium → low.
 */
export const NEGATION_PATTERNS = [
  "i don't",
  "i'm not",
  "not going to",
  'never',
  "won't",
  "wouldn't",
  'dont',
  'im not',
  'wont',
  'wouldnt',
];
