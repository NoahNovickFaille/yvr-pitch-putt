# Requirements: v1.1 Memory Revamp

## Overview

v1.1 transforms the memory system from keyword matching to semantic understanding. The goal is to make conversations feel truly continuous — the app should "know" the user better with each session.

**Source:** MEMORY_SYSTEM_AUDIT.md (Phases 1-3)

## Requirements

### Embedding Infrastructure (EMB)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| EMB-01 | Integrate small embedding model (~23MB) for semantic similarity | v1 | all-MiniLM-L6-v2 or similar |
| EMB-02 | Generate embeddings at memory extraction time | v1 | Background, non-blocking |
| EMB-03 | Store embeddings in MMKV alongside memories | v1 | Base64 Float32Array |
| EMB-04 | Deduplicate on extraction (similarity > 0.85 = merge) | v1 | Update existing instead of creating new |
| EMB-05 | Migrate existing memories with embeddings | v1 | Background task on first launch |
| EMB-06 | Embedding inference must not block UI thread | v1 | <100ms per embedding target |

### Semantic Retrieval (SEM)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| SEM-01 | Replace keyword matching with embedding similarity | v1 | Cosine similarity |
| SEM-02 | New scoring: 50% semantic + 30% decay + 20% importance | v1 | Configurable weights |
| SEM-03 | Structured retrieval: identity + topic-relevant + recent | v1 | Multiple retrieval strategies |
| SEM-04 | Identity memories always included in context | v1 | Name, core traits |
| SEM-05 | Brute-force search acceptable for <5000 memories | v1 | No ANN index needed yet |

### Hierarchical Memory (HIE)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| HIE-01 | Expand memory categories (identity, relationship, situation, preference, event, emotion) | v1 | Replace simple fact/emotion/event |
| HIE-02 | Enhanced extraction prompt with category awareness | v1 | 4-5 few-shot examples |
| HIE-03 | Structured memory injection (organized sections in prompt) | v1 | About them / Current situation / Relevant context |
| HIE-04 | Keep memory budget conservative (≤650 tokens) | v1 | "Lost in the Middle" mitigation |
| HIE-05 | Category-specific decay rates | v1 | Identity slower than emotions |

### Out of Scope (v1.2+)

| ID | What | Why |
|----|------|-----|
| OS-01 | Contradiction detection and resolution | Phase 5 in audit — complexity |
| OS-02 | Memory consolidation (weekly summarization) | Phase 5 in audit — complexity |
| OS-03 | Proactive memory surfacing | Phase 5 in audit — complexity |
| OS-04 | Entity relationship graphs | Nice-to-have, not core |
| OS-05 | ANN index for vector search | Only needed at >5000 memories |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMB-01 | Phase 5 | Complete |
| EMB-02 | Phase 5 | Complete |
| EMB-03 | Phase 5 | Complete |
| EMB-04 | Phase 5 | Complete |
| EMB-05 | Phase 5 | Complete |
| EMB-06 | Phase 5 | Complete |
| SEM-01 | Phase 6 | Complete |
| SEM-02 | Phase 6 | Complete |
| SEM-03 | Phase 6 | Complete |
| SEM-04 | Phase 6 | Complete |
| SEM-05 | Phase 6 | Complete |
| HIE-01 | Phase 7 | Pending |
| HIE-02 | Phase 7 | Pending |
| HIE-03 | Phase 7 | Pending |
| HIE-04 | Phase 7 | Pending |
| HIE-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Created: 2026-01-19 for v1.1 Memory Revamp*
