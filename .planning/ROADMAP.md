# Roadmap: Cove

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-01-17)
- 🚧 **v1.1 Memory Revamp** - Phases 5-7 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-17</summary>

### Phase 1: Foundation
**Goal**: Model download infrastructure, storage layer, memory management
**Plans**: 3 plans (complete)

### Phase 2: Core Chat
**Goal**: Chat UI with streaming, voice input, crisis detection
**Plans**: 7 plans (complete)

### Phase 3: Memory System
**Goal**: Memory extraction, decay scoring, retrieval, context injection
**Plans**: 6 plans (complete)

### Phase 4: Polish
**Goal**: Onboarding, settings, App Store preparation
**Plans**: 4 plans (complete)

See [v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md) for details.

</details>

---

## 🚧 v1.1 Memory Revamp (In Progress)

**Milestone Goal:** Transform memory from keyword matching to semantic understanding with organized memory structure.

- [x] **Phase 5: Embedding Infrastructure** - Add embedding model, deduplication, migrate memories
- [x] **Phase 6: Semantic Retrieval** - Replace keyword matching with embedding similarity
- [ ] **Phase 7: Hierarchical Memory** - New categories, structured extraction and injection

---

### Phase 5: Embedding Infrastructure

**Goal**: Add embedding model for semantic similarity, implement deduplication
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: EMB-01, EMB-02, EMB-03, EMB-04, EMB-05, EMB-06

**Success Criteria** (what must be TRUE):
1. Embedding model loads and generates vectors on device
2. New memories get embeddings at extraction time
3. Duplicate memories merge instead of creating new entries
4. Existing memories have embeddings (migration complete)
5. UI remains responsive during embedding generation

**Plans**: 5 plans

Plans:
- [x] 05-01-PLAN.md — Embedding constants and type definitions
- [x] 05-02-PLAN.md — EmbeddingService singleton and download hook
- [x] 05-03-PLAN.md — Storage utilities and cosine similarity
- [x] 05-04-PLAN.md — Deduplication and MemoryOrchestrator integration
- [x] 05-05-PLAN.md — Migration for existing memories

**Wave Structure:**
- Wave 1: 05-01 (foundation)
- Wave 2: 05-02, 05-03 (parallel - service and storage)
- Wave 3: 05-04 (integration)
- Wave 4: 05-05 (migration)

---

### Phase 6: Semantic Retrieval

**Goal**: Replace keyword matching with embedding-based similarity scoring
**Depends on**: Phase 5
**Requirements**: SEM-01, SEM-02, SEM-03, SEM-04, SEM-05

**Success Criteria** (what must be TRUE):
1. "worried about presentation" retrieves "anxious about work" (semantic match)
2. Identity memories always surface regardless of topic
3. Retrieval speed remains <50ms for typical memory counts
4. Scoring combines semantic similarity, decay, and importance

**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Retrieval constants and type definitions
- [x] 06-02-PLAN.md — SemanticRetrieval service with scoring
- [x] 06-03-PLAN.md — ChatService integration

**Wave Structure:**
- Wave 1: 06-01 (foundation)
- Wave 2: 06-02 (core service)
- Wave 3: 06-03 (integration)

---

### Phase 7: Hierarchical Memory

**Goal**: Organize memories by category with structured prompt injection
**Depends on**: Phase 6
**Requirements**: HIE-01, HIE-02, HIE-03, HIE-04, HIE-05

**Success Criteria** (what must be TRUE):
1. Memories have categories (identity, relationship, situation, preference, event, emotion)
2. Extraction correctly categorizes new memories
3. Prompt shows organized sections (About them / Current situation / Relevant context)
4. Memory budget stays ≤650 tokens
5. LLM responses feel more contextually aware

**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Expand MemoryCategory type and add decay constants
- [ ] 07-02-PLAN.md — Update extraction prompt with category-aware examples
- [ ] 07-03-PLAN.md — Structured memory injection and integration

**Wave Structure:**
- Wave 1: 07-01 (foundation - types and constants)
- Wave 2: 07-02 (extraction prompt)
- Wave 3: 07-03 (structured injection and integration)

---

## Progress

**Execution Order:** 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-01-16 |
| 2. Core Chat | v1.0 | 7/7 | Complete | 2026-01-16 |
| 3. Memory System | v1.0 | 6/6 | Complete | 2026-01-17 |
| 4. Polish | v1.0 | 4/4 | Complete | 2026-01-17 |
| 5. Embedding Infrastructure | v1.1 | 5/5 | Complete | 2026-01-19 |
| 6. Semantic Retrieval | v1.1 | 3/3 | Complete | 2026-01-19 |
| 7. Hierarchical Memory | v1.1 | 0/3 | Not started | - |

---
*Last updated: 2026-01-20*
