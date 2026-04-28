# Phase 7: Hierarchical Memory - Research

**Researched:** 2026-01-19
**Domain:** Memory categorization, structured prompt injection, category-specific decay
**Confidence:** HIGH

## Summary

This phase transforms the basic memory system (`fact | emotion | event`) into a hierarchical categorization system with six categories (identity, relationship, situation, preference, event, emotion) and introduces structured prompt injection that organizes memories into meaningful sections ("About them / Current situation / Relevant context").

The research confirms three key findings:

1. **Hierarchical memory categories** align with cognitive science patterns (episodic vs semantic) and AI companion industry standards (Nomi, Mem0). The six proposed categories map well to both human memory types and practical retrieval needs.

2. **"Lost in the Middle" mitigation** is critical. Research shows LLMs over-emphasize information at the beginning and end of context while neglecting the middle. The solution: place high-importance identity memories FIRST, use structured sections with clear headers, and keep the total memory injection compact (budget capped at 650 tokens per HIE-04).

3. **Category-specific decay** matches the Ebbinghaus forgetting curve principle used in production systems (MemoryBank, Mem0). Identity facts should persist longest (~30 days), emotions should decay fastest (~1 day), and other categories fall between.

**Primary recommendation:** Expand MemoryType to six categories, update the extraction prompt with 4-5 category-aware few-shot examples, modify `buildMemorySectionWithinBudget()` to output structured sections, and add category-to-decay-rate mappings in MemoryDecay.ts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing memory.ts types | N/A | Memory type definitions | Extend MemoryType enum |
| Existing extractionPrompt.ts | N/A | LLM extraction prompts | Add category-aware examples |
| Existing TokenBudget.ts | N/A | Token counting | Modify memory section builder |
| Existing systemPrompt.ts | N/A | Prompt construction | Integrate structured sections |
| Existing MemoryDecay.ts | N/A | Decay calculations | Add category-specific rates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | All infrastructure exists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 6 categories | More granular (10+) | Cognitive overload for 3B model extraction |
| Fixed sections | Dynamic section headings | Simpler, more predictable injection |
| Ebbinghaus decay | Linear decay | Exponential matches human memory better |

**Installation:**
```bash
# No new dependencies required - extends existing infrastructure
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── memory.ts           # UPDATE - expand MemoryType to 6 categories
├── services/
│   ├── memory/
│   │   ├── extractionPrompt.ts  # UPDATE - category-aware examples
│   │   ├── MemoryDecay.ts       # UPDATE - category-specific rates
│   │   └── SemanticRetrieval.ts # UPDATE - category-aware identity detection
│   └── llm/
│       ├── TokenBudget.ts       # UPDATE - structured section builder
│       └── systemPrompt.ts      # UPDATE - integrate structured sections
└── constants/
    └── memory.ts            # NEW - category constants, decay rates
```

### Pattern 1: Hierarchical Memory Categories
**What:** Six-category system replacing basic fact/emotion/event
**When to use:** For all memory storage and retrieval
**Research basis:** Cognitive science (episodic/semantic/procedural), AI companion industry patterns
**Example:**
```typescript
// Source: HIE-01 requirement + cognitive science patterns
export type MemoryCategory =
  | 'identity'      // Name, age, occupation, core traits
  | 'relationship'  // Family, friends, significant others
  | 'situation'     // Current life circumstances, ongoing challenges
  | 'preference'    // Likes, dislikes, habits
  | 'event'         // Specific happenings, milestones
  | 'emotion';      // Current feelings, emotional states

// Mapping from legacy types to new categories
const LEGACY_TYPE_TO_CATEGORY: Record<string, MemoryCategory> = {
  'fact': 'identity',      // Most facts are identity-related
  'person': 'relationship',
  'preference': 'preference',
  'event': 'event',
  'emotion': 'emotion',
};
```

### Pattern 2: Structured Prompt Injection
**What:** Organize memories into labeled sections for LLM consumption
**When to use:** When building memory context for prompts
**Research basis:** "Lost in the Middle" mitigation - structured sections with headers provide positional AND instruction signals
**Example:**
```typescript
// Source: HIE-03 requirement + context engineering research
function buildStructuredMemorySection(
  memories: Memory[],
  maxTokens: number
): string {
  // Group by category
  const grouped = groupByCategory(memories);

  // Build sections in priority order (identity FIRST - primacy effect)
  let section = '';
  let tokens = 0;

  // Section 1: About them (identity + relationship)
  const aboutThem = [
    ...grouped.identity,
    ...grouped.relationship,
  ];
  if (aboutThem.length > 0) {
    section += '### About them\n';
    for (const m of aboutThem) {
      const line = `- ${m.content}\n`;
      tokens += await countTokens(line);
      if (tokens > maxTokens) break;
      section += line;
    }
  }

  // Section 2: Current situation (situation + ongoing emotions)
  const currentSituation = [
    ...grouped.situation,
    ...grouped.emotion,
  ];
  if (currentSituation.length > 0 && tokens < maxTokens) {
    section += '\n### Current situation\n';
    for (const m of currentSituation) {
      const line = `- ${m.content}\n`;
      tokens += await countTokens(line);
      if (tokens > maxTokens) break;
      section += line;
    }
  }

  // Section 3: Relevant context (preferences + events)
  const relevantContext = [
    ...grouped.preference,
    ...grouped.event,
  ];
  if (relevantContext.length > 0 && tokens < maxTokens) {
    section += '\n### Relevant context\n';
    for (const m of relevantContext) {
      const line = `- ${m.content}\n`;
      tokens += await countTokens(line);
      if (tokens > maxTokens) break;
      section += line;
    }
  }

  return section;
}
```

### Pattern 3: Category-Specific Decay Rates
**What:** Different decay constants based on memory category
**When to use:** For calculating memory relevance over time
**Research basis:** Ebbinghaus forgetting curve, MemoryBank implementation
**Example:**
```typescript
// Source: HIE-05 requirement + Ebbinghaus research
// Half-life in hours - how long until memory strength halves
export const CATEGORY_DECAY_RATES: Record<MemoryCategory, number> = {
  identity: 720,     // ~30 days - core facts rarely change
  relationship: 336, // ~2 weeks - relationships evolve slowly
  preference: 168,   // ~1 week - preferences are stable
  situation: 72,     // ~3 days - situations change
  event: 48,         // ~2 days - events are time-bound
  emotion: 24,       // ~1 day - emotions are transient
};

function calculateDecayByCategory(
  memory: Memory,
  now: number = Date.now()
): number {
  const hoursSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60);
  const halfLife = CATEGORY_DECAY_RATES[memory.category];

  // Access count reinforcement (log boost)
  const boostedHalfLife = halfLife * (1 + Math.log10(memory.accessCount + 1));

  // Exponential decay: e^(-t/τ)
  return Math.exp(-hoursSinceAccess / boostedHalfLife);
}
```

### Pattern 4: Category-Aware Extraction Prompt
**What:** Few-shot examples demonstrating category classification
**When to use:** For LLM-based memory extraction
**Research basis:** Small LLM prompting research - 3-5 examples optimal for 3B models
**Example:**
```typescript
// Source: HIE-02 requirement + few-shot prompting research
export const EXTRACTION_PROMPT = `Extract key information about the user from this conversation.
Categorize each memory:
- identity: name, age, job, core traits
- relationship: family, friends, partners
- situation: current challenges, life circumstances
- preference: likes, dislikes, habits
- event: specific happenings, milestones
- emotion: current feelings

Examples:

User: I'm Sarah, 28, and I work as a nurse. My mom has been sick lately.
Output: {"memories":[
  {"content":"User's name is Sarah","category":"identity"},
  {"content":"User is 28 years old","category":"identity"},
  {"content":"User works as a nurse","category":"identity"},
  {"content":"User's mom has been sick recently","category":"relationship"}
]}

User: I've been feeling anxious about my presentation next week.
Output: {"memories":[
  {"content":"User has a presentation next week","category":"event"},
  {"content":"User is feeling anxious","category":"emotion"}
]}

User: I love hiking on weekends. My partner Alex and I usually go together.
Output: {"memories":[
  {"content":"User enjoys hiking on weekends","category":"preference"},
  {"content":"User has a partner named Alex","category":"relationship"},
  {"content":"User hikes with partner Alex","category":"preference"}
]}

User: Things have been stressful at work - they're doing layoffs.
Output: {"memories":[
  {"content":"User's workplace is doing layoffs","category":"situation"},
  {"content":"User is stressed about work","category":"emotion"}
]}

Now extract memories from this conversation. Output valid JSON only:`;
```

### Anti-Patterns to Avoid
- **Flat memory injection:** Listing all memories without structure loses the benefit of headers as attention anchors
- **Over-categorizing:** Trying to extract all 6 categories from every conversation; let extraction be sparse
- **Ignoring "Lost in the Middle":** Placing important identity at end of context instead of beginning
- **Uniform decay:** Using same decay rate for all categories defeats the purpose of categorization
- **Too many few-shot examples:** More than 5 examples bloats extraction prompt for 3B model

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Custom approximation | `countTokens()` from TokenBudget.ts | Uses actual tokenizer when available |
| Decay calculation | Custom formula | Extend existing `calculateDecay()` | Already handles access count reinforcement |
| Memory scoring | Category-only scoring | Existing multi-factor scoring + category | Semantic + decay + importance already proven |
| Identity detection | Keyword matching only | Existing `isIdentityMemory()` + category | Combine structural and content detection |

**Key insight:** This phase is about EXTENDING existing infrastructure, not replacing it. The semantic retrieval buckets (identity, topic-relevant, recent) align well with the new category structure.

## Common Pitfalls

### Pitfall 1: Token Budget Exceeded with Structured Sections
**What goes wrong:** Section headers + bullet formatting consume tokens, exceeding 650 token budget
**Why it happens:** Not accounting for header overhead in budget calculations
**How to avoid:** Reserve ~50 tokens for section headers; actual memory content gets 600 tokens
**Warning signs:** Memories being truncated mid-section; token budget warning logs

### Pitfall 2: 3B Model Struggles with Category Classification
**What goes wrong:** LLM outputs wrong categories or invents new ones
**Why it happens:** Too many categories, insufficient examples, complex prompt
**How to avoid:**
  - Keep categories to 6 (cognitive limit)
  - 4-5 concrete few-shot examples covering all categories
  - Simple enum in JSON schema
  - Consider accepting "best guess" with fallback mapping
**Warning signs:** Extraction returning "fact" or unknown categories

### Pitfall 3: Over-Reliance on Category for Retrieval
**What goes wrong:** Retrieving only by category ignores semantic relevance
**Why it happens:** Category becomes the primary retrieval dimension
**How to avoid:** Category informs STRUCTURE of injection, but retrieval still uses semantic scoring
**Warning signs:** "What about my job?" retrieves unrelated identity memories

### Pitfall 4: Section Ordering Ignores "Lost in the Middle"
**What goes wrong:** Important identity context placed in middle section, gets ignored
**Why it happens:** Arbitrary section ordering
**How to avoid:**
  - ALWAYS place "About them" (identity/relationship) FIRST
  - "Current situation" in middle (acceptable)
  - "Relevant context" last (recency effect helps)
**Warning signs:** LLM forgetting user's name despite it being in context

### Pitfall 5: Decay Rates Too Aggressive
**What goes wrong:** Valuable memories decay before they're reinforced
**Why it happens:** Decay rates tuned for high-frequency users, but casual users lose context
**How to avoid:** Start conservative (longer half-lives), tune down based on observation
**Warning signs:** Returning users treated as strangers after 2-3 days

## Code Examples

Verified patterns for implementation:

### Complete Category Type System
```typescript
// Source: HIE-01 requirement
// File: src/types/memory.ts

/**
 * Memory categories - expanded for hierarchical organization
 * Replaces basic 'fact' | 'emotion' | 'event' with semantic categories
 */
export type MemoryCategory =
  | 'identity'      // Core identity: name, age, occupation, traits
  | 'relationship'  // People: family, friends, partners, pets
  | 'situation'     // Ongoing circumstances: challenges, life changes
  | 'preference'    // Likes/dislikes: activities, foods, habits
  | 'event'         // Time-bound: appointments, milestones, incidents
  | 'emotion';      // Current state: feelings, moods

/**
 * Infer importance from memory category
 * Higher importance = more likely to surface in retrieval
 */
export function inferImportanceFromCategory(category: MemoryCategory): number {
  switch (category) {
    case 'identity':
      return 9;      // Core facts always important
    case 'relationship':
      return 8;      // People matter
    case 'preference':
      return 7;      // Preferences are stable
    case 'situation':
      return 6;      // Context-dependent
    case 'event':
      return 5;      // Time-bound, less permanent
    case 'emotion':
      return 4;      // Transient by nature
    default:
      return 5;
  }
}
```

### Updated Extraction Schema
```typescript
// Source: HIE-02 requirement
// File: src/services/memory/extractionPrompt.ts

export const MEMORY_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          category: {
            type: 'string',
            enum: ['identity', 'relationship', 'situation', 'preference', 'event', 'emotion']
          }
        },
        required: ['content', 'category']
      }
    }
  },
  required: ['memories']
};
```

### Structured Section Builder
```typescript
// Source: HIE-03, HIE-04 requirements
// File: src/services/llm/TokenBudget.ts

const SECTION_HEADER_TOKENS = 15; // ~15 tokens per section header
const MAX_MEMORY_TOKENS = 650;    // HIE-04 budget constraint
const CONTENT_BUDGET = MAX_MEMORY_TOKENS - (SECTION_HEADER_TOKENS * 3);

export async function buildStructuredMemorySection(
  memories: Memory[]
): Promise<string | null> {
  if (memories.length === 0) return null;

  // Group by category
  const byCategory = new Map<MemoryCategory, Memory[]>();
  for (const m of memories) {
    const existing = byCategory.get(m.category) || [];
    byCategory.set(m.category, [...existing, m]);
  }

  let section = '';
  let currentTokens = 0;
  const contentBudget = CONTENT_BUDGET;

  // Section 1: About them (identity + relationship) - FIRST for primacy effect
  const aboutThem = [
    ...(byCategory.get('identity') || []),
    ...(byCategory.get('relationship') || []),
  ];
  if (aboutThem.length > 0) {
    section += '### About them\n';
    currentTokens += SECTION_HEADER_TOKENS;

    for (const m of aboutThem) {
      const line = `- ${m.content}\n`;
      const lineTokens = await countTokens(line);
      if (currentTokens + lineTokens > contentBudget) break;
      section += line;
      currentTokens += lineTokens;
    }
  }

  // Section 2: Current situation (situation + emotion)
  const situation = [
    ...(byCategory.get('situation') || []),
    ...(byCategory.get('emotion') || []),
  ];
  if (situation.length > 0 && currentTokens < contentBudget) {
    section += '\n### Current situation\n';
    currentTokens += SECTION_HEADER_TOKENS;

    for (const m of situation) {
      const line = `- ${m.content}\n`;
      const lineTokens = await countTokens(line);
      if (currentTokens + lineTokens > contentBudget) break;
      section += line;
      currentTokens += lineTokens;
    }
  }

  // Section 3: Relevant context (preference + event)
  const context = [
    ...(byCategory.get('preference') || []),
    ...(byCategory.get('event') || []),
  ];
  if (context.length > 0 && currentTokens < contentBudget) {
    section += '\n### Relevant context\n';
    currentTokens += SECTION_HEADER_TOKENS;

    for (const m of context) {
      const line = `- ${m.content}\n`;
      const lineTokens = await countTokens(line);
      if (currentTokens + lineTokens > contentBudget) break;
      section += line;
      currentTokens += lineTokens;
    }
  }

  return section || null;
}
```

### Category-Specific Decay Constants
```typescript
// Source: HIE-05 requirement
// File: src/constants/memory.ts

/**
 * Decay half-life in hours by memory category
 * Longer half-life = slower decay = persists longer
 *
 * Based on Ebbinghaus forgetting curve research:
 * - Identity facts rarely change, persist longest
 * - Emotions are transient, decay fastest
 */
export const CATEGORY_DECAY_RATES: Record<MemoryCategory, number> = {
  identity: 720,     // 30 days - "My name is Sarah"
  relationship: 336, // 14 days - "I have a sister named Emma"
  preference: 168,   // 7 days - "I love hiking"
  situation: 72,     // 3 days - "Work has been stressful"
  event: 48,         // 2 days - "I have a meeting Friday"
  emotion: 24,       // 1 day - "I'm feeling anxious"
};
```

### Integration with Existing Retrieval
```typescript
// Source: Integration with Phase 6 SemanticRetrieval
// File: src/services/memory/SemanticRetrieval.ts

// Update isIdentityMemory to use new category
export function isIdentityMemory(memory: Memory): boolean {
  // Direct category check (new system)
  if (memory.category === 'identity' || memory.category === 'relationship') {
    return true;
  }

  // Fallback for legacy memories without category
  if (memory.type === 'person') {
    return true;
  }

  // Content-based detection for legacy 'fact' type
  if (memory.type === 'fact') {
    const content = memory.content.toLowerCase();
    return (
      content.includes('name is') ||
      content.includes('works as') ||
      content.includes('job is') ||
      content.includes('lives in') ||
      content.includes('is a ')
    );
  }

  return false;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3 types (fact/emotion/event) | 6 categories (semantic grouping) | 2025 | Better organization, targeted decay |
| Flat memory injection | Structured sections with headers | 2025 | "Lost in the Middle" mitigation |
| Uniform decay (persistent/temporal) | Category-specific decay rates | 2025 | More realistic memory lifecycle |
| Simple system prompt | Section-organized memory context | 2025 | Better LLM attention to important context |

**Current industry patterns (2025):**
- Multi-tier memory (Mem0: conversation/session/user/org)
- Emotional memory markers (Nomi AI: three-layer system)
- Surprise-based memory (Google Titans: adaptive decay)
- RAG + semantic memory layers (Loveon AI)

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal decay rates for emotional companion context**
   - What we know: Ebbinghaus curve validated, production systems use 1-30 day range
   - What's unclear: Best rates for casual vs daily users
   - Recommendation: Start with proposed rates (24h-720h), add logging, tune based on user re-engagement patterns

2. **Migration strategy for existing memories**
   - What we know: Current memories have `type` field, need `category`
   - What's unclear: Automatic migration accuracy vs manual review
   - Recommendation: Create migration that infers category from type + content patterns, mark as "migrated" for review

3. **3B model category extraction accuracy**
   - What we know: Few-shot prompting effective for small models
   - What's unclear: Error rate for 6-category classification
   - Recommendation: Test with current extraction pipeline, accept some miscategorization, add category correction UI later if needed

4. **Section header wording impact**
   - What we know: Headers act as attention anchors
   - What's unclear: Best wording for emotional companion context
   - Recommendation: Start with "About them / Current situation / Relevant context", A/B test alternatives later

## Sources

### Primary (HIGH confidence)
- Existing codebase - `memory.ts`, `extractionPrompt.ts`, `TokenBudget.ts`, `MemoryDecay.ts`, `SemanticRetrieval.ts`
- Phase 6 RESEARCH.md - Established retrieval patterns and buckets
- [Lost in the Middle (Stanford/UCB 2023)](https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf) - U-shaped attention curve, primacy/recency effects
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Structured prompts, section organization

### Secondary (MEDIUM confidence)
- [From Human Memory to AI Memory Survey (2025)](https://arxiv.org/html/2504.15965v2) - Memory categories, decay mechanisms, Ebbinghaus integration
- [Mem0 Memory Types](https://docs.mem0.ai/core-concepts/memory-types) - Production memory architecture patterns
- [TechXplore: Lost in the Middle Research (2025)](https://techxplore.com/news/2025-06-lost-middle-llm-architecture-ai.html) - Position bias mitigation strategies
- [Prompt Engineering Guide: Few-Shot](https://www.promptingguide.ai/techniques/fewshot) - Small model prompting best practices

### Tertiary (LOW confidence)
- [Nomi AI Review](https://realconnection.ai/blog/nomi-ai-review-emotional-ai-companion-memory-soul) - AI companion memory patterns
- [Medium: Small LLM Prompting](https://maliknaik.medium.com/prompt-engineering-for-small-llms-llama-3b-qwen-4b-and-phi-3-mini-de711d38a002) - 3B model extraction guidance

## Metadata

**Confidence breakdown:**
- Category system (6 categories): HIGH - aligns with cognitive science, production systems
- Structured injection pattern: HIGH - well-documented "Lost in the Middle" research
- Category-specific decay rates: MEDIUM - based on Ebbinghaus but needs tuning
- 3B model extraction accuracy: MEDIUM - few-shot works but error rate unknown
- Optimal section wording: LOW - needs A/B testing

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - extends stable Phase 6 patterns)
