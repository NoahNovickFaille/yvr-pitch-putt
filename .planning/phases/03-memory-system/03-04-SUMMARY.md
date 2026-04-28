---
phase: 03-memory-system
plan: 04
subsystem: memory
tags: [memory-orchestration, appstate, conversation-lifecycle, react-hooks, typescript]

# Dependency graph
requires:
  - phase: 03-02
    provides: memoryStore with addMemories() and pruneDecayed()
  - phase: 03-03
    provides: extractMemories and formatConversationForExtraction functions
  - phase: 02-04
    provides: chatStore with markConversationEnded() and messages array
provides:
  - MemoryOrchestrator singleton coordinating extraction and storage
  - useConversationEnd hook triggering extraction on app background
  - 1-minute extraction cooldown preventing excessive calls
  - Non-blocking extraction flow that doesn't interfere with app lifecycle
affects: [conversation-flow, memory-retrieval, app-lifecycle-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Singleton orchestration pattern for memory extraction", "AppState listener for conversation boundaries", "Fire-and-forget async pattern for non-blocking extraction"]

key-files:
  created:
    - src/services/memory/MemoryOrchestrator.ts
  modified:
    - src/hooks/useConversationEnd.ts

key-decisions:
  - "1-minute extraction cooldown prevents excessive extraction attempts"
  - "Concurrent extraction guard with isExtracting flag"
  - "Fire-and-forget pattern for non-blocking app lifecycle"
  - "Removed callback parameter from useConversationEnd for simpler API"

patterns-established:
  - "Pattern 1: Singleton orchestrator guards against concurrent operations with state flags"
  - "Pattern 2: AppState listener in React hook for lifecycle detection without blocking"
  - "Pattern 3: Fire-and-forget async calls with catch handlers for graceful error handling"

# Metrics
duration: 1.7min
completed: 2026-01-17
---

# Phase 03 Plan 04: Memory Orchestration & Lifecycle Summary

**Singleton orchestrator with extraction guards and AppState-triggered conversation end detection enabling automatic non-blocking memory extraction on app background**

## Performance

- **Duration:** 1.7 min (101 seconds)
- **Started:** 2026-01-17T06:08:32Z
- **Completed:** 2026-01-17T06:10:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- MemoryOrchestrator singleton coordinates extraction pipeline with guards
- 1-minute cooldown prevents excessive extraction calls
- Concurrent extraction guard prevents duplicate operations
- useConversationEnd hook refactored to directly integrate with orchestrator
- Fire-and-forget extraction pattern ensures app lifecycle isn't blocked
- markConversationEnded() automatically called on app background

## Task Commits

Each task was committed atomically:

1. **Task 1: Create memory orchestrator service** - `c32d7e8` (feat)
2. **Task 2: Integrate conversation end hook with memory orchestration** - `8ed9b20` (feat)

**Plan metadata:** (included in this commit)

## Files Created/Modified
- `src/services/memory/MemoryOrchestrator.ts` - Singleton orchestrator with extractAndStore() method, guards against concurrent/frequent extraction, validates LLM readiness and message count
- `src/hooks/useConversationEnd.ts` - React hook for AppState monitoring, triggers markConversationEnded() and MemoryOrchestrator.extractAndStore() on app background

## Decisions Made

**1-minute extraction cooldown:**
- Prevents excessive extraction attempts when app rapidly backgrounds
- lastExtractionTime timestamp tracked across calls
- Guards execution even if multiple triggers fire

**Concurrent extraction guard:**
- isExtracting boolean flag prevents overlapping extraction operations
- Set true at start, false in finally block for guaranteed cleanup
- Multiple simultaneous background events won't create duplicate extractions

**Fire-and-forget pattern:**
- extractAndStore() call wrapped in .catch() for error handling
- Doesn't await completion, allows app to background immediately
- Console error logging for debugging without disrupting lifecycle

**Removed callback parameter:**
- Prior useConversationEnd signature: `(onConversationEnd: () => void) => void`
- New signature: `() => void`
- Simpler API - no callback wiring needed in consuming components
- Direct integration with MemoryOrchestrator singleton

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Integration into ChatScreen to activate memory extraction
- Testing extraction flow on app background events
- Memory retrieval in conversation context (future phase)

**Foundation established:**
- Complete extraction pipeline from trigger → orchestrator → extractor → store
- Non-blocking lifecycle integration prevents app freeze
- Guards ensure extraction runs efficiently without spam
- Error handling allows graceful degradation

**No blockers.**

---
*Phase: 03-memory-system*
*Completed: 2026-01-17*
