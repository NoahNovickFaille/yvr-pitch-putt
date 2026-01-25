# Cove

## What This Is

A local-first iOS app that serves as a private emotional companion. Users can have conversations about their feelings with an on-device LLM, and the app builds memory over time to offer personalized, contextual responses. All data stays on-device — no cloud, no accounts, complete privacy.

Inspired by How We Feel's design sensibility but differentiated by being conversational rather than structured check-ins.

## Core Value

The memory system that makes conversations feel continuous across sessions — a mediocre model with good memory beats a great model with no context.

## Current Status

**v1.1 Memory Revamp** - Shipped 2026-01-20

The memory system has been transformed from keyword matching to semantic understanding:
- Embedding model (all-MiniLM-L6-v2) for semantic similarity
- Deduplication on extraction (similarity > 0.85 = merge)
- 3-bucket semantic retrieval (identity + topic-relevant + recent)
- 6 hierarchical memory categories with decay rates
- Structured prompt injection (About/Situation/Context sections)

See `src/services/memory/README.md` and `src/services/embedding/CLAUDE.md` for implementation details.

## Requirements

### Validated

*Requirements shipped and validated through user testing.*

- [x] Model downloads and initializes on-device (~1.8GB Llama 3.2 3B) — v1.0
- [x] Chat interface with streaming token-by-token responses — v1.0
- [x] Speech-to-text input via microphone button — v1.0
- [x] Conversations persist to local storage (MMKV) — v1.0
- [x] Memory extraction runs after conversations end — v1.0
- [x] Memory retrieval injects relevant context into prompts — v1.0
- [x] Crisis detection shows resources for distress signals — v1.0
- [x] Onboarding flow with privacy explanation and disclaimer — v1.0
- [x] Settings screen with crisis resources and disclaimer access — v1.0
- [x] App ready for TestFlight beta distribution — v1.0

### Shipped in v1.1

*Memory Revamp — Shipped 2026-01-20*

**Embedding Infrastructure & Deduplication**
- [x] Integrate embedding model (all-MiniLM-L6-v2, ~21MB)
- [x] Generate embeddings at memory extraction time
- [x] Store embeddings in MMKV alongside memories
- [x] Deduplicate on extraction (similarity > 0.85 = merge)
- [x] Migrate existing memories (background embedding generation)

**Semantic Retrieval**
- [x] Replace keyword matching with embedding similarity
- [x] New scoring: 50% semantic + 30% decay + 20% importance
- [x] Structured retrieval: identity + topic-relevant + recent memories

**Hierarchical Memory Structure**
- [x] Expand memory categories (identity, relationship, situation, preference, event, emotion)
- [x] Enhanced extraction prompt with category awareness
- [x] Structured memory injection (organized sections in prompt)

### Active

*No active development — planning next milestone*

### Out of Scope

- Weekly reflections / insights generation — v2 feature
- Emotional trend visualization — v2 feature
- Proactive conversation starters — v2 feature
- Cloud sync or backup — conflicts with privacy-first principle
- User accounts / authentication — unnecessary for local-only app
- Android support — iOS-first, may revisit later

## Context

**Design reference:** How We Feel app (https://mobbin.com/apps/how-we-feel-ios-88680053-11ec-4c6c-8763-1e2aa70388e7)

**Model selection:** Llama 3.2 3B Instruct (Q4_K_M quantization) as primary. 1B variant available as lite alternative for older devices.

**Privacy architecture:** Everything on-device. iOS speech recognition is on-device by default. No analytics, no telemetry, no network calls except model download.

**Target audience:** Personal use and friends via App Store. Not a therapy replacement — an emotional journal with memory.

**Success criteria from user:**
- Natural 10-message conversation flow
- Memory correctly recalls context from 3 days prior
- Response time under 10 seconds on iPhone 12
- Friends/testers say "this actually feels helpful"

**Current state (v1.1):**
- ~9,000+ lines TypeScript
- On TestFlight for beta testing
- 7 phases, 33 plans complete
- See [MILESTONES.md](./MILESTONES.md) for full history

## Constraints

- **Tech stack**: React Native (Expo), llama.rn, react-native-mmkv, Uniwind, react-native-voice, React Navigation — locked per user specification
- **Platform**: iOS only for v1
- **Model context**: 4096 tokens — requires rolling window approach for conversation history
- **Device RAM**: ~2.5-3GB during inference — must handle memory pressure gracefully
- **Distribution**: App Store (TestFlight for beta)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| llama.rn over ExecuTorch | GGUF ecosystem more flexible for model swapping; ExecuTorch considered for future if performance needed | Validated in v1.0 |
| MMKV over SQLite | Synchronous, fast key-value storage; simpler for JSON documents than relational DB | Validated in v1.0 |
| Uniwind over NativeWind | Build-time optimized, near-StyleSheet performance with Tailwind DX | Validated in v1.0 |
| 3B model as default | Balance of quality and speed; 1B available as fallback | Validated in v1.0 |

---
*Last updated: 2026-01-25 after v1.1 milestone completion*
