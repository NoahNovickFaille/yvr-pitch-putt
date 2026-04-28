---
phase: 03-memory-system
plan: 01
subsystem: memory
tags: [memory-extraction, llm, json-schema, typescript, types]

# Dependency graph
requires:
  - phase: 02-core-chat
    provides: chat.ts type pattern for consistent type definitions
provides:
  - Memory type system with 5 types and 3 decay categories
  - LLM extraction prompt with structured JSON schema
  - generateMemoryId helper for unique memory identification
affects: [03-02, 03-03, 03-04, memory-extraction, memory-retrieval]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Type definitions following chat.ts pattern", "JSON Schema for LLM structured output"]

key-files:
  created:
    - src/types/memory.ts
    - src/services/memory/extractionPrompt.ts
  modified: []

key-decisions:
  - "5 memory types (person, event, emotion, fact, preference) cover semantic categories"
  - "3 decay categories (persistent, temporal, contextual) enable differential decay rates"
  - "1-10 importance scale matches research patterns for memory weighting"
  - "0-8 memories per conversation prevents extraction overload"
  - "200 char max content enforces concise memory storage"

patterns-established:
  - "Pattern 1: Memory types follow union type pattern from chat.ts"
  - "Pattern 2: JSON Schema for llama.rn structured extraction"
  - "Pattern 3: Memory interface includes decay tracking (lastAccessed, accessCount)"

# Metrics
duration: 1.3min
completed: 2026-01-16
---

# Phase 03 Plan 01: Memory Types & Extraction Prompt Summary

**5 semantic memory types with 3-tier decay categories, LLM extraction prompt enforcing 0-8 memories per conversation via JSON schema**

## Performance

- **Duration:** 1.3 min (75 seconds)
- **Started:** 2026-01-16T22:01:19Z
- **Completed:** 2026-01-16T22:02:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Memory type system with 5 semantic categories (person, event, emotion, fact, preference)
- 3-tier decay categorization (persistent/temporal/contextual) for differential forgetting curves
- LLM extraction prompt with importance scoring guidance (1-10 scale)
- JSON Schema enforcing structured extraction output compatible with llama.rn

## Task Commits

Each task was committed atomically:

1. **Task 1: Create memory type definitions** - `7277e67` (feat)
2. **Task 2: Create extraction prompt and JSON schema** - `a29dd7b` (feat)

**Plan metadata:** (included in this commit)

## Files Created/Modified
- `src/types/memory.ts` - Memory type definitions, ExtractionResult interface, generateMemoryId helper
- `src/services/memory/extractionPrompt.ts` - MEMORY_EXTRACTION_PROMPT and MEMORY_EXTRACTION_SCHEMA for LLM

## Decisions Made

**5 memory types decision:**
- person, event, emotion, fact, preference cover semantic categories from research
- Aligns with Mem0 and SimpleMem patterns for memory categorization

**3-tier decay categories:**
- persistent (168h half-life): relationships, identity, preferences
- temporal (24h half-life): recent events, current emotions
- contextual (4h half-life): conversation-specific details
- Enables Ebbinghaus-inspired differential decay rates in retrieval

**1-10 importance scale:**
- 10: core identity (name, profession, major relationships)
- 7-9: significant events, important people
- 4-6: notable preferences, recurring topics
- 1-3: minor details, passing mentions
- Matches research patterns and provides clear guidance for extraction

**0-8 memories per conversation:**
- Prevents extraction overload from verbose conversations
- Balances capture vs processing cost
- Schema maxItems: 8 enforces limit

**200 char max content:**
- Forces concise, distilled memory storage
- Keeps token budget manageable during retrieval
- Schema maxLength: 200 enforces limit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 03 Plan 02: Memory extraction service implementation (can import types)
- Phase 03 Plan 03: Memory storage and retrieval (can use Memory interface)

**Foundation established:**
- Type definitions provide contract for extraction and storage
- JSON Schema ready for llama.rn `response_format.json_schema` parameter
- Extraction prompt provides clear LLM instructions

**No blockers.**

---
*Phase: 03-memory-system*
*Completed: 2026-01-16*
