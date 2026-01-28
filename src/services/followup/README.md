# Follow-Up Service

The follow-up service enables proactive check-ins by detecting temporal references in raw user messages and surfacing them as conversation starters when the target date arrives.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   MemoryOrchestrator                         │
│  (Triggers temporal detection on raw conversation messages)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   TemporalDetector                           │
│  (Regex-based scanning of user messages for time references) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FollowUpStore                             │
│  (MMKV persistence with pending/delivered/expired lifecycle) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FollowUpRetrieval                           │
│  (Priority scoring and due-candidate selection)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              useFollowUp (Hook in ChatScreen)                │
│  (App foreground → check due → generate LLM check-in)       │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `TemporalDetector.ts` | Scans memory content for temporal patterns, resolves target dates |
| `FollowUpStore.ts` | MMKV-persisted candidate store with lifecycle management |
| `FollowUpRetrieval.ts` | Priority scoring and best-candidate selection |

The delivery hook lives at `src/hooks/useFollowUp.ts`.

## Design Decision: Raw Messages Over Extracted Memories

Temporal detection operates on the user's raw messages — **not** on LLM-extracted memory summaries. This is a deliberate architectural choice:

- **Reliability**: The user's actual words always contain the temporal phrases. LLM extraction paraphrases and often drops time references (e.g., "dentist appointment tomorrow" becomes "stressed about a dentist appointment").
- **Determinism**: Regex matching is deterministic. Coupling it to stochastic LLM output creates fragile, untestable behavior.
- **Separation of concerns**: Memory extraction distills facts. Temporal detection finds time references. These are independent operations that should not be coupled.

## Temporal Detection

### Supported Patterns

| Pattern | Example | Resolves To |
|---------|---------|-------------|
| `tomorrow` | "job interview tomorrow" | Next day (start of day) |
| `tonight` | "dinner party tonight" | Next morning 9am |
| `this weekend` | "moving this weekend" | Monday after weekend |
| `next week` | "starting next week" | 1 week from reference |
| `next month` | "trip next month" | 1 month from reference |
| `in N days` | "in 3 days" | N days from reference |
| `in a couple/few days` | "in a few days" | 3 days from reference |
| `in N weeks` | "in 2 weeks" | N weeks from reference |
| Named days | "on Friday", "next Tuesday" | Next occurrence of that day |
| `today`/`this morning`/etc. | "meeting today" | Next day (follow up tomorrow) |

### Topic Extraction

The detector extracts a short topic phrase from the user's message by stripping temporal references, first-person pronouns, and common lead-in verbs:

```
"I have a dentist appointment tomorrow" → "dentist appointment"
"I'm starting a new job next week" → "starting a new job"
```

### Constraints

- Only one candidate per memory (first temporal match wins)
- Target date must be at least `FOLLOW_UP_MIN_HOURS_AHEAD` (4h) from now
- `in N days` capped at 60 days; `in N weeks` capped at 8 weeks

## Follow-Up Store

### Candidate Lifecycle

```
Created (pending) ──→ Due (followUpAt ≤ now) ──→ Delivered
                                                     │
                            Past expiry window ──→ Expired
```

### Storage

- Persisted in MMKV under key `follow_up_candidates`
- All operations synchronous (persist-before-state pattern)
- Deduplication by `sourceMessageId` (one candidate per user message)

### Limits

| Constant | Value | Purpose |
|----------|-------|---------|
| `FOLLOW_UP_EXPIRY_MS` | 7 days | Candidates expire if not delivered |
| `FOLLOW_UP_MAX_PENDING` | 10 | Oldest pending dropped when exceeded |
| `FOLLOW_UP_MIN_HOURS_AHEAD` | 4h | Avoids "today" duplicates |
| `FOLLOW_UP_PROMPT_BUDGET` | 80 tokens | System prompt allocation |

### Cleanup

`FollowUpStore.cleanup()` runs before each retrieval check:
- Pending candidates past their expiry window are marked `expired`
- Expired and delivered candidates older than the expiry window are removed entirely

## Follow-Up Retrieval

### Priority Scoring

When multiple follow-ups are due simultaneously, candidates are ranked:

```
score = recencyScore × 0.7 + specificityScore × 0.3
```

Where:
- **recencyScore** (0-1): Prefers candidates that just became due (decays over 1 week)
- **specificityScore** (0-1): Shorter topics are more specific, scored higher

### Usage

```typescript
import { getBestDueFollowUp, markFollowUpDelivered } from './FollowUpRetrieval';

const followUp = getBestDueFollowUp(); // Also runs cleanup
if (followUp) {
  // Generate check-in message...
  markFollowUpDelivered(followUp.id, conversationId);
}
```

## Delivery (useFollowUp Hook)

The `useFollowUp` hook in `src/hooks/useFollowUp.ts` handles delivery:

### Trigger Points

1. **On conversation change**: Checks whenever `activeConversationId` changes (covers initial mount, new chat, conversation switch). 300ms delay to let the UI settle.
2. **On foreground**: Checks when app returns from background (with 30s cooldown)

### Guards

All must pass before generating a follow-up message:

1. Not already generating a follow-up
2. Conversation is empty (no messages)
3. LLM is not busy (not generating)
4. A due follow-up candidate exists
5. No user message appeared during setup (race condition guard)

### Generation

```
App foreground / mount
        │
        ▼
  Check guards ──→ Any fail? → Skip
        │
        ▼
  getBestDueFollowUp()
        │
        ▼
  Build system prompt + memories + follow-up section
        │
        ▼
  LLM completion (128 tokens, LOW priority)
        │
        ▼
  Stream tokens → Complete → Mark delivered
```

The LLM receives the follow-up context via `buildFollowUpSection()` in `systemPrompt.ts`, which instructs it to open naturally with a brief check-in about the topic.

## Data Types

```typescript
type FollowUpStatus = 'pending' | 'delivered' | 'expired';

interface FollowUpCandidate {
  id: string;                // "fup-{timestamp}-{random}"
  sourceMessageId: string;   // User message that triggered detection
  sourceContent: string;     // Raw user message text
  topic: string;             // Extracted noun phrase
  followUpAt: number;        // Target timestamp
  createdAt: number;
  status: FollowUpStatus;
  deliveredAt?: number;      // When delivered
  conversationId?: string;   // Conversation it was delivered in
}
```

Defined in `src/types/memory.ts`. Constants in `src/constants/memory.ts`.

## Integration Points

### Memory System
- MemoryOrchestrator runs temporal detection on raw user messages before LLM extraction begins
- Detection is fully decoupled from extraction — runs as a background task (`scheduleBackground`)
- Does not depend on extraction success; uses conversation messages directly

### LLM System
- `systemPrompt.ts` exports `buildFollowUpSection()` for follow-up prompt construction
- Follow-up completions use LOW priority via `LLMService.queuedCompletion()`

### Chat System
- `useFollowUp` hook called in ChatScreen alongside `useChat`
- Uses `chatStore.startGeneration()` / `completeGeneration()` for streaming UI

## Debugging

Key log prefixes:
- `[FollowUpStore]` - Candidate persistence (add, deliver, cleanup)
- `[MemoryOrchestrator]` - Follow-up candidate creation count
- `[useFollowUp]` - Delivery decisions and generation status
