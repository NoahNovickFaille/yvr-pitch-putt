# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Memory system that makes conversations feel continuous across sessions
**Current focus:** Phase 2 - Core Chat (In Progress)

## Current Position

Phase: 2 of 4 (Core Chat)
Plan: 2 of 7 complete
Status: In progress
Last activity: 2026-01-17 - Completed 02-02-PLAN.md (Crisis Detection)

Progress: [#####-----] 45%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 3.0 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |
| 02-core-chat | 2/7 | 4 min | 2.0 min |

## Accumulated Context

### Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| app.config.js over app.json | 01-01 | Enables dynamic configuration and cleaner plugin setup |
| iOS-only platform | 01-01 | Per PROJECT.md constraints, Android out of scope for v1 |
| Conservative n_ctx (2048) | 01-01 | Reduces memory footprint for iPhone 12 (4GB RAM) |
| createMMKV() API for MMKV v3 | 01-02 | v3 uses Nitro modules with function-based creation |
| expo-file-system/legacy imports | 01-02 | New API uses class-based File/Directory, legacy has documentDirectory |
| createDownloadTask() + start() | 01-02 | Background downloader v3 API pattern |
| State subscription pattern for LLMService | 01-03 | Set-based listeners for reactive updates without Zustand in core |
| Single memory warning Alert per session | 01-03 | Prevents alert spam during sustained memory pressure |
| Promise deduplication for init | 01-03 | Prevents multiple concurrent initialization attempts |
| Phrase-based crisis matching | 02-02 | Phrase matching over single words reduces false positives (slang vs crisis) |
| Two-tier severity system | 02-02 | High-severity (any match) vs medium-severity (2+ matches) balances sensitivity/specificity |
| 15-character negation window | 02-02 | Handles "I don't want to die" while being performant |

### Pending Todos

(None)

### Blockers/Concerns

(None)

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed 02-02-PLAN.md (Crisis Detection)
Resume file: None
