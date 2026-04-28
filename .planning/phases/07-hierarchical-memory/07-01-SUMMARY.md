---
phase: 07-hierarchical-memory
plan: 01
subsystem: memory
tags: [memory, types, decay, constants, hierarchical]

# Dependency graph
requires:
  - phase: 05-embedding-infrastructure
    provides: embedding system for memory deduplication
  - phase: 06-semantic-retrieval
    provides: semantic retrieval pipeline
provides:
  - MemoryCategory type with 6 semantic categories
  - Category-specific decay rates (CATEGORY_DECAY_RATES)
  - Category-to-importance mapping (inferImportanceFromCategory)
  - Memory section token budget constants
affects: [07-02, 07-03, memory-extraction, memory-injection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Semantic categorization for memory organization"
    - "Category-specific decay rates based on Ebbinghaus research"

key-files:
  created:
    - src/constants/memory.ts
  modified:
    - src/types/memory.ts
    - src/services/memory/MemoryDecay.ts

key-decisions:
  - "6 semantic categories: identity, relationship, situation, preference, event, emotion"
  - "Decay rates range from 720h (identity) to 24h (emotion)"
  - "Legacy memories default to 'identity' category for backward compatibility"

patterns-established:
  - "Category-based decay: different memory types decay at different rates"
  - "Constants centralization: memory-related constants in src/constants/memory.ts"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 7 Plan 01: Memory Types Summary

**Expanded MemoryCategory to 6 semantic categories (identity, relationship, situation, preference, event, emotion) with category-specific decay rates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-20T05:08:16Z
- **Completed:** 2026-01-20T05:11:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Replaced basic persistent/temporal/contextual categories with 6 semantic categories
- Created centralized memory constants file with decay rates and importance mappings
- Updated MemoryDecay service to use new category-based rates
- Maintained backward compatibility for existing memories (default to identity)

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand MemoryCategory type** - `80620d0` (feat)
2. **Task 2: Create memory constants** - `5df0369` (feat)
3. **Task 3: Update MemoryDecay** - `3b12e07` (refactor)

## Files Created/Modified
- `src/types/memory.ts` - MemoryCategory type with 6 semantic values, updated inferCategory function
- `src/constants/memory.ts` - CATEGORY_DECAY_RATES, inferImportanceFromCategory, MEMORY_SECTION_BUDGET
- `src/services/memory/MemoryDecay.ts` - calculateDecay now uses CATEGORY_DECAY_RATES

## Decisions Made
- **6 semantic categories:** identity, relationship, situation, preference, event, emotion - chosen to match natural memory organization patterns
- **Decay half-lives:** identity (720h/30d), relationship (336h/14d), preference (168h/7d), situation (72h/3d), event (48h/2d), emotion (24h/1d) - based on Ebbinghaus forgetting curve research
- **Legacy fallback:** Memories without category default to 'identity' (longest decay) to preserve existing memories
- **DECAY_STRENGTH_LEGACY:** Kept legacy constant with deprecation note for reference during migration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Memory types foundation complete for hierarchical organization
- Ready for 07-02: Memory extraction prompt updates to categorize memories
- CATEGORY_DECAY_RATES can be used by MemoryExtractor to set proper decay
- inferImportanceFromCategory available for importance assignment during extraction

---
*Phase: 07-hierarchical-memory*
*Completed: 2026-01-20*
