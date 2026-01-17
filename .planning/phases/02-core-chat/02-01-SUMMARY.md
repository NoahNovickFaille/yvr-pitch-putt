---
phase: 02-core-chat
plan: 01
subsystem: chat
tags: [typescript, chat, system-prompt, llama]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: LLMService with context management
provides:
  - ChatMessage and Conversation types for message persistence
  - SYSTEM_PROMPT with empathetic AI personality
  - STOP_WORDS for Llama 3.2 completion detection
affects: [02-02, 02-03, 02-04, 02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [message-type-system, empathetic-prompt-design]

key-files:
  created:
    - src/types/chat.ts
    - src/services/llm/systemPrompt.ts
  modified: []

key-decisions:
  - "Used timestamp-based message IDs with random suffix for uniqueness"
  - "System prompt emphasizes warmth over clinical therapy language"
  - "Included 9 stop words covering all Llama 3.2 variants"

patterns-established:
  - "Message ID generation: timestamp + random string for guaranteed uniqueness"
  - "System prompt structure: core principles, personality traits, boundaries"

# Metrics
duration: 2min
completed: 2026-01-17
---

# Phase 02 Plan 01: Chat Types & System Prompt Summary

**Minimal chat type system with empathetic AI personality prompt for Llama 3.2**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-17T03:35:46Z
- **Completed:** 2026-01-17T03:37:48Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created ChatMessage and Conversation types for message structure
- Defined empathetic system prompt with 17 guidance principles
- Established stop words for clean Llama 3.2 completion detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chat type definitions** - `0e1dea3` (feat)
2. **Task 2: Create system prompt and stop words** - `f570fbf` (feat)

## Files Created/Modified
- `src/types/chat.ts` - ChatMessage, Conversation types with ID generation helper
- `src/services/llm/systemPrompt.ts` - Empathetic AI personality prompt and stop words

## Decisions Made

**Message ID format:** Used `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` for message IDs. This provides timestamp-based ordering plus collision resistance through random suffix.

**System prompt philosophy:** Emphasized "warm friend" over "clinical therapist" to create approachable personality. Included explicit boundaries (not a medical professional) to set appropriate expectations.

**Stop word coverage:** Included 9 stop tokens covering all Llama 3.2 variants (`</s>`, `<|eot_id|>`, `<|end_of_text|>`, etc.) to ensure clean response endings across different model configurations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for next phases:
- **02-02**: Message persistence can import ChatMessage type
- **02-03**: Chat UI can import types and display messages
- **02-04**: Completion service can import SYSTEM_PROMPT and STOP_WORDS
- **02-05**: Speech input can create ChatMessage objects
- **02-06**: Crisis detection can analyze ChatMessage content

All foundational types and prompts in place for full chat implementation.

---
*Phase: 02-core-chat*
*Completed: 2026-01-17*
