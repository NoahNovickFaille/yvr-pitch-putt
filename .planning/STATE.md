# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Memory system that makes conversations feel continuous across sessions
**Current focus:** Phase 2 - Core Chat (In Progress)

## Current Position

Phase: 2 of 4 (Core Chat)
Plan: 4 of 7 complete
Status: In progress
Last activity: 2026-01-16 - Completed 02-04-PLAN.md (Chat Store)

Progress: [#######---] 57%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 2.7 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |
| 02-core-chat | 4/7 | 10 min | 2.5 min |

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
| Persist to MMKV before state updates | 02-04 | Synchronous writes before set() ensure data survives app termination |
| Track conversationMeta with startedAt/endedAt | 02-04 | Phase 3 memory extraction needs session boundaries |
| Separate streaming state from persisted messages | 02-04 | isGenerating/partialResponse are transient UI state, not conversation data |
| storage.remove() not storage.delete() | 02-04 | MMKV v3 Nitro API uses remove() method per interface definition |
| Crisis detection runs BEFORE model interaction | 02-05 | Ensures no unsafe content ever reaches the model - safety-first architecture |
| Streaming via callback pattern | 02-05 | Simple callbacks (onToken, onComplete) over async generators for React integration |
| continueAfterCrisis separate method | 02-05 | Explicit post-acknowledgment path without re-running crisis detection |
| Temperature 0.7 for chat | 02-05 | Balances empathy (needs creativity) with coherence (needs consistency) |

### Pending Todos

(None)

### Blockers/Concerns

(None)

## Session Continuity

Last session: 2026-01-16
Stopped at: Completed 02-04-PLAN.md (Chat Store)
Resume file: None
