---
phase: 03-memory-system
plan: 02
subsystem: memory
tags: [zustand, mmkv, ebbinghaus, decay-algorithm, memory-persistence]

# Dependency graph
requires:
  - phase: 03-01
    provides: Memory type definitions and MemoryCategory constants
  - phase: 02-04
    provides: chatStore.ts pattern for MMKV persist-before-set approach
provides:
  - Ebbinghaus-inspired decay calculations with 3-tier half-life
  - Zustand memory store with MMKV persistence
  - Relevance scoring combining importance and temporal decay
  - Keyword-based context retrieval with configurable blending
affects: [03-03, 03-04, memory-extraction, memory-retrieval, conversation-context]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Ebbinghaus decay formula with access reinforcement", "Persist-before-set MMKV pattern"]

key-files:
  created:
    - src/services/memory/MemoryDecay.ts
    - src/stores/memoryStore.ts
  modified: []

key-decisions:
  - "168h/24h/4h half-life for persistent/temporal/contextual memories"
  - "Logarithmic access count boost prevents unlimited strengthening"
  - "70/30 blend of relevance score and keyword match for context retrieval"
  - "5-keyword threshold for perfect keyword match (capped at 1.0)"

patterns-established:
  - "Pattern 1: Ebbinghaus decay formula with boosted strength based on access frequency"
  - "Pattern 2: Composite scoring (base relevance + contextual bonus) for ranked retrieval"
  - "Pattern 3: Persist-before-set pattern from chatStore ensures MMKV durability"

# Metrics
duration: 1.5min
completed: 2026-01-16
---

# Phase 03 Plan 02: Memory Decay & Storage Summary

**Ebbinghaus decay with logarithmic access reinforcement, Zustand store persisting to MMKV, 70/30 relevance+keyword scoring for context-aware retrieval**

## Performance

- **Duration:** 1.5 min (90 seconds)
- **Started:** 2026-01-17T06:04:34Z
- **Completed:** 2026-01-17T06:06:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Memory decay calculation with 3-tier half-life constants (168h/24h/4h)
- Access count reinforcement using logarithmic boost to slow decay for frequently accessed memories
- Zustand memory store with full CRUD operations (add, access, prune, retrieve, clear)
- MMKV persistence following persist-before-set pattern from chatStore
- Context-aware retrieval blending relevance score (70%) with keyword match (30%)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create memory decay calculation utilities** - `ce970cf` (feat)
2. **Task 2: Create Zustand memory store with MMKV persistence** - `2337caa` (feat)

**Plan metadata:** (included in this commit)

## Files Created/Modified
- `src/services/memory/MemoryDecay.ts` - Ebbinghaus decay calculations, relevance scoring, keyword matching
- `src/stores/memoryStore.ts` - Zustand store for memory persistence and retrieval with MMKV

## Decisions Made

**168h/24h/4h half-life by category:**
- persistent: 168h (~1 week) for facts, relationships, preferences
- temporal: 24h (~1 day) for recent events, current emotions
- contextual: 4h for conversation-specific context
- Aligns with research-backed differential decay rates

**Logarithmic access count boost:**
- Formula: `strength * (1 + Math.log10(accessCount + 1))`
- Prevents unlimited strengthening while rewarding frequent access
- 10 accesses = 2x strength, 100 accesses = 3x strength

**70/30 relevance+keyword blend:**
- Base relevance score (importance × decay) weighted 70%
- Keyword match bonus weighted 30% when context provided
- Balances temporal freshness with topical relevance

**5-keyword threshold for perfect match:**
- calculateKeywordMatch caps at 1.0 after 5+ matching words
- Only considers words >3 characters (filters noise)
- Case-insensitive matching for flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 03 Plan 03: Memory extraction service (can import store and decay functions)
- Phase 03 Plan 04: Memory retrieval in conversation flow (can use getTopMemories)

**Foundation established:**
- Decay calculations ready for memory aging
- Store provides full lifecycle (add, access, prune, retrieve)
- MMKV persistence ensures memories survive app restart
- Relevance scoring enables ranked retrieval

**No blockers.**

---
*Phase: 03-memory-system*
*Completed: 2026-01-16*
