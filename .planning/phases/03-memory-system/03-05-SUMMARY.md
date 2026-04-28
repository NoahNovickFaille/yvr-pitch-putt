---
phase: 03-memory-system
plan: 05
subsystem: memory
tags: [token-budget, memory-injection, chat-integration, llama-tokenizer, context-window]

# Dependency graph
requires:
  - phase: 03-02
    provides: memoryStore with getTopMemories() and markAccessed()
  - phase: 03-04
    provides: MemoryOrchestrator for extraction and storage
provides:
  - Token budget management utilities for 2048 context window
  - Memory injection into system prompt via buildSystemPromptWithMemories()
  - ChatService integration retrieving and using memories in conversations
  - Token-aware conversation history truncation
affects: [conversation-generation, prompt-construction, context-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Token budget allocation pattern", "Memory section construction within budget", "Conversation history truncation from newest to oldest"]

key-files:
  created:
    - src/services/llm/TokenBudget.ts
  modified:
    - src/services/llm/systemPrompt.ts
    - src/services/llm/ChatService.ts

key-decisions:
  - "Token budget allocation: 400 system, 300 memories, 800 conversation, 512 response, 36 overhead"
  - "countTokens() uses actual LLM tokenizer when available, falls back to 4 chars/token estimate"
  - "Memory section injected into system prompt with natural usage instruction"
  - "Conversation history truncated from newest to oldest to preserve recent context"
  - "Mark memories accessed during retrieval for reinforcement"

patterns-established:
  - "Pattern 1: Token budget constants define allocation across context components"
  - "Pattern 2: buildMemorySectionWithinBudget ensures memories fit within allocation"
  - "Pattern 3: buildPromptWithMemories centralizes memory retrieval, injection, and history truncation"

# Metrics
duration: 2.1min
completed: 2026-01-17
---

# Phase 03 Plan 05: Memory Injection & Token Budget Summary

**Token budget management ensuring 2048 context limit, memory injection into system prompt with natural reference instructions, and ChatService integration retrieving top 6 relevant memories per user message**

## Performance

- **Duration:** 2.1 min (125 seconds)
- **Started:** 2026-01-17T06:12:11Z
- **Completed:** 2026-01-17T06:14:16Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Token budget utilities with actual tokenizer integration and fallback estimation
- Memory section construction within 300-token allocation
- Conversation history truncation preserving recent messages within 800-token budget
- System prompt memory injection with natural usage instruction
- ChatService integration retrieving, injecting, and marking memories accessed
- Token budget logging in dev mode for monitoring allocation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create token budget management utilities** - `a74b5f0` (feat)
2. **Task 2: Update system prompt with memory injection** - `e304e8f` (feat)
3. **Task 3: Integrate memories into ChatService** - `059e457` (feat)

**Plan metadata:** (will be included in final commit)

## Files Created/Modified
- `src/services/llm/TokenBudget.ts` - Token budget constants (2048 total), countTokens using LLM tokenizer, buildMemorySectionWithinBudget, truncateConversationHistory
- `src/services/llm/systemPrompt.ts` - buildSystemPromptWithMemories function appending memory section to base SYSTEM_PROMPT
- `src/services/llm/ChatService.ts` - buildPromptWithMemories private method, integrated into sendMessage and continueAfterCrisis

## Decisions Made

**Token budget allocation (2048 total):**
- System prompt: 400 tokens (base personality)
- Memories: 300 tokens (3-6 memories typically)
- Conversation: 800 tokens (recent turns)
- Response: 512 tokens (max generation)
- Overhead: 36 tokens (formatting buffer)
- Based on 03-RESEARCH.md testing for n_ctx=2048

**countTokens() uses actual tokenizer:**
- Calls LLMService.getContext().tokenize() when model loaded
- Falls back to rough estimate (text.length / 4) when model unavailable
- Ensures accurate budget tracking without blocking when LLM not ready

**Memory section injection:**
- "What you remember about this person:" followed by bullet list
- Natural usage instruction: "Don't explicitly say 'I remember' - just reference naturally"
- Prevents awkward "I remember you mentioned..." phrasing

**Conversation history truncation:**
- Processes from newest to oldest (reverse iteration)
- Keeps most recent messages within 800-token allocation
- Ensures recent context preserved over distant history

**Mark memories accessed:**
- getTopMemories() retrieves top 6 by relevance score
- markAccessed() called immediately after retrieval
- Reinforces accessed memories via logarithmic boost in decay calculation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 4: UI enhancements and polish (memory system complete and integrated)
- End-to-end testing of memory extraction → storage → retrieval → injection flow
- Real-world memory continuity across app sessions

**Foundation established:**
- Complete memory pipeline: extraction → storage → decay → retrieval → injection
- Token budget management prevents context overflow
- Natural memory reference in conversations (AI uses memories without "I remember" awkwardness)
- Reinforcement learning through access tracking

**Memory system complete:**
All 5 plans in Phase 3 delivered:
- 03-01: Type definitions and extraction prompt
- 03-02: Decay calculations and Zustand store
- 03-03: LLM-based extraction service
- 03-04: Orchestration and lifecycle integration
- 03-05: Injection and token budget (this plan)

**No blockers. Phase 3 complete.**

---
*Phase: 03-memory-system*
*Completed: 2026-01-17*
