---
phase: 02-core-chat
plan: 02
subsystem: safety
tags: [crisis-detection, mental-health, keyword-matching, safety]

# Dependency graph
requires:
  - phase: 02-01
    provides: Chat type definitions and system prompt foundation
provides:
  - Crisis detection system scanning messages before AI processing
  - Curated keyword lists based on mental health research
  - Negation handling to reduce false positives
affects: [02-03-chat-ui, 02-04-chat-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Phrase-based keyword matching (not single words)
    - Negation pattern detection for context-aware crisis detection
    - Severity tiers (high/medium/low) with different trigger thresholds

key-files:
  created:
    - src/services/safety/crisisKeywords.ts
    - src/services/safety/CrisisDetector.ts
  modified: []

key-decisions:
  - "Phrase-based matching over single-word keywords to reduce false positives"
  - "Two severity tiers: high (any match triggers) and medium (2+ matches required)"
  - "Negation handling demotes severity when phrases like 'I don't' precede crisis language"
  - "15-character window for negation detection (balances accuracy vs false negatives)"

patterns-established:
  - "Crisis detection runs synchronously before message reaches model"
  - "Detection returns detailed result (detected, matchedPhrases, severity) for debugging/logging"
  - "Research-based keyword curation from Crisis Text Line patterns"

# Metrics
duration: 2min
completed: 2026-01-17
---

# Phase 2 Plan 2: Crisis Detection Summary

**Phrase-based crisis detection with negation handling, scanning user messages before AI processing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-17T03:35:45Z
- **Completed:** 2026-01-17T03:37:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Crisis keyword lists curated from mental health research (Crisis Text Line, NIH studies)
- detectCrisis() function with phrase matching and negation handling
- Severity-based detection: high (direct suicidal statements), medium (emotional distress indicators)
- Verified against test cases including negation patterns and false positive scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Create curated crisis keyword lists** - `55b5e36` (feat)
2. **Task 2: Create CrisisDetector with negation handling** - `979dc29` (feat)

## Files Created/Modified
- `src/services/safety/crisisKeywords.ts` - HIGH_SEVERITY_PHRASES (direct crisis statements), MEDIUM_SEVERITY_PHRASES (emotional distress), NEGATION_PATTERNS (for context handling)
- `src/services/safety/CrisisDetector.ts` - detectCrisis() function that scans messages before model processing

## Decisions Made

**1. Phrase-based matching over single-word keywords**
- Rationale: Reduces false positives like "this kills me" (slang) vs "kill myself" (crisis)
- Impact: Higher precision, fewer modal fatigue issues

**2. Two-tier severity system with different thresholds**
- Rationale: High-severity phrases (suicide, self-harm) warrant immediate intervention; medium-severity requires multiple indicators
- Impact: Balances sensitivity (catching real crises) vs specificity (avoiding false alarms)

**3. 15-character negation window**
- Rationale: Handles "I don't want to die" (12 chars) while being performant
- Impact: Demotes negated high-severity phrases to medium, preventing inappropriate modal triggering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following research patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for integration:**
- CrisisDetector can be imported into chat flow (Task 02-03 or 02-04)
- Function signature is stable: `detectCrisis(message: string): CrisisResult`
- Synchronous operation (no async complexity in chat submission flow)

**Future considerations:**
- May need to tune negation window size based on real usage patterns
- Keyword lists can be expanded as false negatives are discovered
- Console.log statements in detector can be removed after development phase

**No blockers** - safety foundation ready for UI integration.

---
*Phase: 02-core-chat*
*Completed: 2026-01-17*
