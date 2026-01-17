# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Memory system that makes conversations feel continuous across sessions
**Current focus:** Phase 3 - Memory System (In Progress)

## Current Position

Phase: 3 of 4 (Memory System)
Plan: 4 of 4 complete
Status: Phase complete
Last activity: 2026-01-17 - Completed 03-04-PLAN.md (Memory Orchestration & Lifecycle)

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 2.1 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |
| 02-core-chat | 5/7 | 12.4 min | 2.5 min |
| 03-memory-system | 4/4 | 6.7 min | 1.7 min |

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
| Typing indicator before streaming | 02-06 | Show animated dots when generation starts, replace with StreamingMessage once first token arrives |
| 5-second crisis modal countdown | 02-06 | Enforces resource acknowledgment without being permanently blocking (balances safety with usability) |
| Haptic feedback on crisis interactions | 02-06 | Warning haptic on modal appearance, medium impact on hotline taps reinforces critical nature |
| Microphone red when active | 02-06 | Visual feedback that speech is being recorded (privacy indicator) |
| Auto-scroll on new content | 02-06 | Scroll to bottom when messages arrive or tokens stream (keeps latest content visible) |
| 5 memory types (person, event, emotion, fact, preference) | 03-01 | Covers semantic categories for meaningful memory extraction |
| 3 decay categories (persistent, temporal, contextual) | 03-01 | Enables differential decay rates (168h/24h/4h half-life) |
| 1-10 importance scale | 03-01 | Matches research patterns, provides clear extraction guidance |
| 0-8 memories per conversation | 03-01 | Prevents extraction overload while capturing key information |
| 200 char max memory content | 03-01 | Forces concise storage, manageable token budget |
| 168h/24h/4h half-life by category | 03-02 | Persistent/temporal/contextual memories have differential decay rates |
| Logarithmic access count boost | 03-02 | Prevents unlimited strengthening (10 accesses = 2x, 100 = 3x strength) |
| 70/30 relevance+keyword blend | 03-02 | Balances temporal freshness (70%) with topical relevance (30%) for retrieval |
| 5-keyword threshold for perfect match | 03-02 | Words >3 chars, capped at 1.0 after 5+ matches, case-insensitive |
| Temperature 0.3 for extraction | 03-03 | Lower than chat's 0.7 for consistent, deterministic memory extraction |
| 20-message limit for extraction | 03-03 | Manages token budget while capturing recent conversation context (~500-1000 tokens) |
| Single retry on parse failure | 03-03 | Explicit JSON instruction on failure, empty array on double failure (no crash) |
| Return empty array on LLM unavailable | 03-03 | Graceful degradation when LLM not loaded, app continues without memories |
| 1-minute extraction cooldown | 03-04 | Prevents excessive extraction attempts when app rapidly backgrounds |
| Concurrent extraction guard | 03-04 | isExtracting flag prevents overlapping extraction operations |
| Fire-and-forget extraction pattern | 03-04 | Non-blocking async calls with catch handlers for graceful error handling |
| No callback parameter in useConversationEnd | 03-04 | Simpler API - direct integration with MemoryOrchestrator singleton |

### Pending Todos

(None)

### Blockers/Concerns

(None)

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed 03-04-PLAN.md (Memory Orchestration & Lifecycle) - Phase 3 complete
Resume file: None
