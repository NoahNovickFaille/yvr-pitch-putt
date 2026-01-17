---
phase: 02-core-chat
plan: 05
subsystem: chat
tags: [llm, chat, crisis-detection, streaming, safety]

# Dependency graph
requires:
  - phase: 02-01
    provides: Chat types and system prompt
  - phase: 02-02
    provides: Crisis detection functionality
  - phase: 01-03
    provides: LLMService for model inference
provides:
  - ChatService orchestration layer with crisis detection and streaming
  - Safe message sending flow with pre-model crisis checks
  - Token streaming callback interface for responsive UX
  - Post-crisis continuation method
affects: [02-06, 02-07, chat-ui, conversation-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [crisis-first-validation, streaming-callbacks, error-boundary-pattern]

key-files:
  created: [src/services/llm/ChatService.ts]
  modified: []

key-decisions:
  - "Crisis detection runs synchronously BEFORE any model interaction to prevent unsafe content reaching the model"
  - "Streaming via callback pattern for token-by-token display without async iteration complexity"
  - "continueAfterCrisis method provides explicit path for post-crisis flow without re-running detection"
  - "Temperature 0.7 balances empathy (needs creativity) with coherence (needs consistency)"

patterns-established:
  - "Service pattern: synchronous validation → async model call → streaming response"
  - "Crisis-first architecture: safety checks are first operation, not middleware"
  - "Callback streaming: onToken for each token, onComplete for full text, onCrisis for safety"

# Metrics
duration: 1min
completed: 2026-01-16
---

# Phase 02-05: Chat Service Summary

**Crisis-first chat orchestration with token streaming and empathetic system prompt via ChatService singleton**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-16T19:41:13Z
- **Completed:** 2026-01-16T19:42:21Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- ChatService orchestrates complete message sending flow with safety-first design
- Crisis detection happens before any model interaction (SAFE-01 compliance)
- Token-by-token streaming via callback for perceived responsiveness (CHAT-02)
- System prompt automatically included in every completion (CHAT-09)
- continueAfterCrisis method enables post-acknowledgment flow (SAFE-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ChatService with crisis detection and streaming** - `a5fe71c` (feat)

**Plan metadata:** (will be committed after SUMMARY creation)

## Files Created/Modified
- `src/services/llm/ChatService.ts` - Chat orchestration with crisis detection, streaming, and system prompt integration

## Decisions Made

**Crisis detection timing:** Run detectCrisis synchronously BEFORE calling LLMService.getContext(). This ensures no unsafe content ever reaches the model, even if crisis handling is slow.

**Streaming callback pattern:** Use simple callback functions (onToken, onComplete, onCrisis) instead of async generators or observables. Callbacks are immediately understood by React state setters and don't require additional libraries.

**continueAfterCrisis method:** Separate method that skips crisis detection for explicit post-acknowledgment flow. Caller must decide when to use this (after user sees crisis modal and chooses to continue).

**Temperature 0.7:** Slightly elevated from default 0.6 to allow for more empathetic, warm responses while maintaining coherence. System prompt establishes personality, temperature allows it to express.

## Deviations from Plan

None - plan executed exactly as written. The implementation matched the provided specification completely.

## Issues Encountered

None - all dependencies (LLMService, CrisisDetector, systemPrompt, chat types) were already in place from previous plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

ChatService is ready for integration:
- **For chat UI (02-06):** Use sendMessage with callbacks for real-time display
- **For conversation store (02-07):** Integrate with message persistence layer
- **Crisis flow:** UI must implement crisis modal that calls onCrisis callback
- **Error handling:** UI should display error messages from SendMessageResult.error field

**Blockers:** None
**Concerns:** None - all safety requirements met, streaming works as designed

---
*Phase: 02-core-chat*
*Completed: 2026-01-16*
