# Cove

## What This Is

A local-first iOS app that serves as a private emotional companion. Users can have conversations about their feelings with an on-device LLM, and the app builds memory over time to offer personalized, contextual responses. All data stays on-device — no cloud, no accounts, complete privacy.

Inspired by How We Feel's design sensibility but differentiated by being conversational rather than structured check-ins.

## Core Value

The memory system that makes conversations feel continuous across sessions — a mediocre model with good memory beats a great model with no context.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Model downloads and initializes on-device (~1.8GB Llama 3.2 3B)
- [ ] Chat interface with streaming token-by-token responses
- [ ] Speech-to-text input via microphone button
- [ ] Conversations persist to local storage (MMKV)
- [ ] Memory extraction runs after conversations end
- [ ] Memory retrieval injects relevant context into prompts
- [ ] Crisis detection shows resources for distress signals
- [ ] Onboarding flow with privacy explanation and disclaimer
- [ ] Settings screen with crisis resources and disclaimer access
- [ ] App ready for TestFlight beta distribution

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

## Constraints

- **Tech stack**: React Native (Expo), llama.rn, react-native-mmkv, Uniwind, react-native-voice, React Navigation — locked per user specification
- **Platform**: iOS only for v1
- **Model context**: 4096 tokens — requires rolling window approach for conversation history
- **Device RAM**: ~2.5-3GB during inference — must handle memory pressure gracefully
- **Distribution**: App Store (TestFlight for beta)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| llama.rn over ExecuTorch | GGUF ecosystem more flexible for model swapping; ExecuTorch considered for future if performance needed | — Pending |
| MMKV over SQLite | Synchronous, fast key-value storage; simpler for JSON documents than relational DB | — Pending |
| Uniwind over NativeWind | Build-time optimized, near-StyleSheet performance with Tailwind DX | — Pending |
| 3B model as default | Balance of quality and speed; 1B available as fallback | — Pending |

---
*Last updated: 2026-01-16 after initialization*
