# Safety Service

The safety service provides crisis detection to identify users who may be in emotional distress or at risk of self-harm. It runs BEFORE any LLM processing to ensure immediate response without inference delay.

## Architecture Overview

```
User Message
     │
     ▼
┌─────────────────────────────────────────┐
│           CrisisDetector                 │
│  ┌─────────────────────────────────┐    │
│  │  Normalize & Preprocess         │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │  Check Negation Patterns        │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │  Scan HIGH Severity Phrases     │◀───│─── crisisKeywords.ts
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │  Scan MEDIUM Severity Phrases   │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
└─────────────────┼───────────────────────┘
                  │
                  ▼
           CrisisResult
```

## Files

| File | Purpose |
|------|---------|
| `CrisisDetector.ts` | Detection logic with negation handling |
| `crisisKeywords.ts` | Phrase lists by severity level |

## Crisis Detection Flow

### Integration Point

Crisis detection runs at the START of `ChatService.sendMessage()`:

```typescript
// In ChatService.sendMessage()

// 1. FIRST: Check for crisis (no LLM delay)
const crisisResult = detectCrisis(userMessage);

if (crisisResult.detected) {
  // 2. Immediately notify UI
  options.onCrisis?.(crisisResult);

  // 3. Stop processing - no LLM call
  return;
}

// 4. Only if no crisis: proceed with LLM
```

### Why Before LLM?

1. **No Delay**: Detection is instant (regex-based), LLM inference takes seconds
2. **Safety Priority**: Crisis resources shown immediately
3. **Clean Separation**: LLM never sees crisis messages (no inappropriate response risk)

## Detection Algorithm

### Step 1: Normalize Input

```typescript
const normalized = message.toLowerCase().trim();
```

### Step 2: Check for Negations

Before matching crisis phrases, check if they're negated:

```typescript
// Negation patterns
const negations = [
  "i don't",
  "i'm not",
  "never",
  "won't",
  "wouldn't",
  "not going to",
  // ... more patterns
];

// Check within 15 characters before the phrase
function isNegated(message: string, phraseIndex: number): boolean {
  const prefix = message.slice(Math.max(0, phraseIndex - 15), phraseIndex);
  return negations.some(neg => prefix.includes(neg));
}
```

### Step 3: Scan HIGH Severity Phrases

HIGH severity phrases indicate immediate self-harm intent:

```typescript
const highSeverityPhrases = [
  'kill myself',
  'want to die',
  'end my life',
  'suicide',
  'hurt myself',
  'harm myself',
  'take my own life',
  // ... more phrases
];

// Single match = HIGH severity (unless negated)
// Negated match = demoted to MEDIUM
```

### Step 4: Scan MEDIUM Severity Phrases

MEDIUM severity phrases indicate emotional distress:

```typescript
const mediumSeverityPhrases = [
  'hopeless',
  'worthless',
  'trapped',
  'burden to everyone',
  'what\'s the point',
  'giving up',
  // ... more phrases
];

// Requires 2+ matches for MEDIUM severity
```

### Severity Decision Matrix

| Condition | Result |
|-----------|--------|
| 1+ HIGH phrase (not negated) | `severity: 'high'` |
| 1 HIGH phrase (negated) + 1+ MEDIUM | `severity: 'medium'` |
| 2+ MEDIUM phrases | `severity: 'medium'` |
| 1 MEDIUM or 1 negated HIGH | `severity: 'low'` (no crisis) |
| No matches | `severity: 'low'` (no crisis) |

## Crisis Result Structure

```typescript
interface CrisisResult {
  detected: boolean;       // true if crisis detected
  severity: 'high' | 'medium' | 'low';
  matchedPhrases: string[]; // phrases that triggered detection
}
```

## Usage

```typescript
import { detectCrisis } from './CrisisDetector';

const result = detectCrisis("I feel so hopeless and worthless");

if (result.detected) {
  console.log('Crisis detected:', result.severity);
  console.log('Matched:', result.matchedPhrases);
  // Show crisis resources UI
}
```

## Negation Handling Examples

| Input | Detection | Reason |
|-------|-----------|--------|
| "I want to kill myself" | HIGH | Direct match |
| "I don't want to kill myself" | LOW | Negated within 15 chars |
| "I would never hurt myself" | LOW | Negated |
| "I feel hopeless and worthless" | MEDIUM | 2 medium phrases |
| "I'm not hopeless" | LOW | Single negated medium |

## Phrase Lists

### HIGH Severity (Immediate Risk)

Any single match triggers HIGH severity:

- `kill myself`
- `want to die`
- `end my life`
- `suicide`
- `take my own life`
- `ending it all`
- `no reason to live`
- `better off dead`
- `not worth living`
- `hurt myself`
- `harm myself`
- `don't want to be here` / `dont want to be here`
- `can't go on` / `cant go on`

### MEDIUM Severity (Emotional Distress)

Requires 2+ matches:

- `hopeless`
- `worthless`
- `trapped`
- `burden to everyone` / `burden on everyone`
- `no way out`
- `giving up`
- `can't take it anymore` / `cant take it anymore`
- `what's the point` / `whats the point`

### Negation Patterns

Checked within 15 characters before phrase:

- `i don't` / `dont`
- `i'm not` / `im not`
- `not going to`
- `never`
- `won't` / `wont`
- `wouldn't` / `wouldnt`

## UI Integration

When crisis is detected, the app shows a crisis dialog:

```typescript
// In Chat component
const handleCrisis = (result: CrisisResult) => {
  setCrisisResult(result);
  setShowCrisisModal(true);
};

// Crisis modal shows:
// - Validation message ("I hear you're going through something difficult")
// - Crisis hotline numbers
// - Option to continue conversation
// - Option to close and get help
```

### Continuing After Crisis

If user acknowledges the crisis dialog and wants to continue:

```typescript
import { continueAfterCrisis } from './ChatService';

// Bypasses crisis detection for this message
await continueAfterCrisis(userMessage, history, callbacks);
```

## Design Decisions

### Phrase-Based vs Word-Based

We use phrases (not single words) to reduce false positives:

| Approach | "I killed it at work today" |
|----------|----------------------------|
| Word-based | FALSE POSITIVE (contains "killed") |
| Phrase-based | No match (no crisis phrase) |

### Negation Window (15 chars)

The 15-character window balances:
- **Too short**: Misses negations like "I would never"
- **Too long**: Catches unrelated negations in long sentences

### No Machine Learning

We use deterministic pattern matching because:
1. **Predictable**: Exact phrases trigger detection
2. **No false negatives**: Critical for safety
3. **Fast**: No model inference needed
4. **Offline**: Works without network

## Testing

Test cases should cover:

```typescript
// Direct matches
detectCrisis("I want to kill myself")     // HIGH
detectCrisis("I feel like ending it all") // HIGH

// Negated matches
detectCrisis("I don't want to hurt myself") // LOW
detectCrisis("I would never kill myself")   // LOW

// Medium severity
detectCrisis("I feel hopeless")             // LOW (only 1)
detectCrisis("I feel hopeless and worthless") // MEDIUM

// Edge cases
detectCrisis("My friend mentioned suicide") // HIGH (still catches)
detectCrisis("")                            // LOW
detectCrisis("I'm doing great!")            // LOW
```

## Limitations

1. **Language**: English only
2. **Indirect References**: May miss metaphorical expressions
3. **Context**: Cannot understand full conversation context
4. **Over-Triggering**: May trigger on quotes or hypotheticals

## Future Improvements

- Multi-language support
- Contextual analysis (past N messages)
- Confidence scores
- User-specific sensitivity settings
- Integration with crisis text lines
