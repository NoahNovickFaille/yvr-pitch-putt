# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Memory system that makes conversations feel continuous across sessions
**Current focus:** Phase 2 - Core Chat (In Progress)

## Current Position

Phase: 2 of 4 (Core Chat)
Plan: 3 of 7 complete
Status: In progress
Last activity: 2026-01-17 - Completed 02-03-PLAN.md (Speech Recognition)

Progress: [######----] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 3.0 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |
| 02-core-chat | 3/7 | 7 min | 2.3 min |

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
| Timestamp-based message IDs with random suffix | 02-01 | Provides ordering and collision resistance for message uniqueness |
| Warm friend over clinical therapist personality | 02-01 | Creates approachable AI that validates without medical overreach |
| Comprehensive Llama 3.2 stop words | 02-01 | 9 stop tokens ensure clean response endings across model variants |
| Phrase-based crisis matching | 02-02 | Phrase matching over single words reduces false positives (slang vs crisis) |
| Two-tier severity system | 02-02 | High-severity (any match) vs medium-severity (2+ matches) balances sensitivity/specificity |
| 15-character negation window | 02-02 | Handles "I don't want to die" while being performant |
| requiresOnDeviceRecognition: true | 02-03 | Enforces local processing, no cloud dependency, aligns with privacy focus |
| iosTaskHint: 'dictation' | 02-03 | Optimizes iOS SFSpeechRecognizer for natural speech vs short commands |
| interimResults: true | 02-03 | Enables real-time transcript updates as user speaks for responsive UX |
| Service wrapper pattern for native modules | 02-03 | Separates imperative native module control from React state management |

### Pending Todos

(None)

### Blockers/Concerns

(None)

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed 02-03-PLAN.md (Speech Recognition)
Resume file: None
