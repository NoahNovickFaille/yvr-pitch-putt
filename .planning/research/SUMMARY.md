# Project Research Summary

**Project:** Confidant
**Domain:** Local-first emotional companion / AI journaling iOS app
**Researched:** 2026-01-16
**Confidence:** HIGH

## Executive Summary

Confidant is a local-first iOS emotional companion app that differentiates through complete privacy (on-device LLM, no cloud) and memory-driven conversation continuity. Research confirms this is a viable approach with a clear tech stack: Expo SDK 54 with React Native's New Architecture, llama.rn for on-device inference (Llama 3.2 3B), MMKV for fast local storage, and @react-native-voice/voice for speech-to-text. The local-first approach is a genuine competitive advantage since 91% of surveyed users would pay more for on-device AI processing, and no major competitor (Pi, Replika, Wysa, Woebot) offers fully offline operation.

The recommended approach is to build in four phases: Foundation (model download infrastructure, storage layer, memory management), Core Chat (LLM integration, streaming UI, voice input, crisis detection), Memory System (extraction, retrieval, context building), and Polish (onboarding, settings, App Store preparation). This ordering respects dependency chains discovered in architecture research while front-loading the highest-risk technical challenges (iOS memory pressure, large file downloads) before building features atop them.

Key risks include iOS memory pressure terminating the app during inference (3B model needs ~2.5-3GB RAM), failed/corrupted model downloads (1.8GB file with expo-file-system's known issues), inadequate crisis detection (legal liability under California SB 243 and New York AI Companion Laws), and context loss in long conversations ("lost in the middle" effect). Mitigation strategies are documented in PITFALLS.md and must be addressed in their respective phases. The memory system is the core product differentiator; a mediocre model with excellent memory beats a great model with no context.

## Key Findings

### Recommended Stack

The stack is validated and locked. Expo SDK 54 provides React Native 0.81 with New Architecture enabled by default, which is required by the chosen libraries (MMKV v4, Reanimated 4). llama.rn is the only mature GGUF runtime for React Native and supports Metal acceleration on iOS. MMKV is 30x faster than AsyncStorage and provides synchronous access. Development builds via expo-dev-client are required since llama.rn cannot run in Expo Go.

**Core technologies:**
- **React Native (Expo SDK 54):** Cross-platform framework with precompiled RN reducing iOS builds from 120s to 10s
- **llama.rn v0.9.1:** On-device LLM inference with Metal support, streaming completions, and tool calling
- **react-native-mmkv v4.1.1:** Fast key-value storage (30x AsyncStorage) with Nitro Modules
- **Uniwind v1.0.0:** Tailwind CSS styling, 2.5x faster than NativeWind, Tailwind 4 support
- **@react-native-voice/voice v3.2.4:** iOS on-device speech recognition with Expo config plugin
- **zustand v5.x:** Lightweight state management (~2KB) with fine-grained re-renders

### Expected Features

Feature research identified clear table stakes vs differentiators. The key insight: Confidant's positioning is "conversational companion with memory" rather than "clinical CBT tool" (Woebot/Wysa's territory).

**Must have (table stakes):**
- Conversational AI chat with streaming responses
- Chat history persistence
- Privacy/data security (encryption at rest)
- Empathetic tone in responses
- Crisis detection and safety resources
- Basic settings and onboarding

**Should have (competitive differentiators):**
- Memory system (conversation continuity across sessions) - CORE DIFFERENTIATOR
- Fully local/private (no cloud) - CORE DIFFERENTIATOR
- Voice input (speech-to-text) - significant friction reduction
- Offline-first functionality

**Defer (v2+):**
- Weekly reflections and emotional trends visualization
- HealthKit integration
- Cloud sync (if ever - risks privacy positioning)
- Mood tracking as separate feature
- Widget support

### Architecture Approach

The architecture follows a three-layer pattern: Presentation (screens, components), Service (LLM, Memory, Crisis, Speech services), and Data (MMKV storage, llama.rn context). The LLM service must be a singleton initialized once at app launch since model loading takes 5-15 seconds and consumes 2.5-3GB RAM. Context management uses a rolling window approach with token budget enforcement (4096 total, ~2500 for messages, 600 for memories, 512 reserved for response).

**Major components:**
1. **LLMService (singleton):** Model initialization, streaming completion, context management
2. **MemoryService:** Post-conversation extraction, relevance scoring with decay, retrieval
3. **CrisisService:** Pre-send detection (before LLM sees message), non-dismissable resources
4. **ContextBuilder:** Rolling window assembly, token budget enforcement, memory injection
5. **Storage layer:** MMKV instances for conversations, messages, memories, settings (separate keys, not one blob)

### Critical Pitfalls

1. **iOS memory pressure kills app during inference** - Monitor memory with `os_proc_available_memory()`, use Q4_K_M quantization, set context to 2048 tokens, implement aggressive background unloading. Must verify <3GB peak memory on iPhone 12.

2. **Model download fails without recovery** - Use `FileSystem.createDownloadResumable` with progress persistence, implement checksum verification, persist download state to MMKV on every progress callback, test with network interruption and app kill scenarios.

3. **Inadequate crisis detection** - Implement multi-layer detection (keyword + LLM classification), never rely solely on companion LLM, use pre-send checking (before LLM generates response), maintain hardcoded crisis resources that cannot be overridden. Required for California SB 243 compliance.

4. **Conversation context lost ("lost in the middle")** - Place critical context at START of prompt not middle, implement importance-weighted message retention, test with 20+ message conversations. This directly impacts the core product promise.

5. **App Store rejection** - Include clear disclaimer ("not a replacement for professional mental health care"), set age rating to 17+ proactively, document privacy practices thoroughly, prepare App Review notes explaining local-only architecture.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Model download and memory management are highest-risk technical challenges. Every other feature depends on the model being loadable and inference not crashing the app. Storage patterns must be established before building features atop them.
**Delivers:** Working model download with resume/verify, MMKV storage layer, type definitions, LLM service shell with memory monitoring
**Addresses:** Model download/setup (P1 feature), privacy/data security foundation
**Avoids:** Memory crash pitfall, download failure pitfall, single-MMKV-key anti-pattern

### Phase 2: Core Chat Experience
**Rationale:** Once infrastructure works, build the primary interaction. Crisis detection must be implemented alongside chat, not as an afterthought - it's legally required and safety-critical.
**Delivers:** Chat UI with streaming, voice input, crisis detection with resources modal, message persistence
**Uses:** llama.rn completion API, @react-native-voice/voice, MMKV message store
**Implements:** LLMService completion, CrisisService pre-send detection, SpeechService wrapper
**Avoids:** Crisis detection failure pitfall, emotional dependency pitfall (via healthy usage patterns)

### Phase 3: Memory System
**Rationale:** Memory is the core differentiator. Requires working chat to extract from and test against. Context management complexity justifies dedicated phase.
**Delivers:** Memory extraction (background), memory retrieval with decay scoring, context builder with rolling window
**Implements:** MemoryService, MemoryExtractor (AppState-triggered), ContextBuilder with token budget
**Avoids:** Context loss pitfall, "lost in the middle" effect

### Phase 4: Polish and Launch Prep
**Rationale:** App Store compliance, onboarding, and UX polish once core functionality is solid. Disclaimers and privacy explanations require the actual product to be demonstrable.
**Delivers:** Onboarding flow with disclaimers, settings screen, App Store metadata and submission
**Addresses:** Onboarding (P1 feature), settings (P1 feature)
**Avoids:** App Store rejection pitfall, UX friction pitfalls

### Phase Ordering Rationale

- **Foundation first:** Memory management issues will manifest as crashes that block all testing. Better to solve early than discover after building features.
- **Crisis detection in Phase 2, not Phase 4:** Safety features are legally required (SB 243) and ethically non-negotiable. Treating safety as "polish" is an anti-pattern.
- **Memory system as separate phase:** Context engineering is complex enough to warrant focused attention. Rushing it undermines the core differentiator.
- **No v1.x features in initial phases:** Export, backup, advanced memory, and mood tracking are explicitly deferred per FEATURES.md prioritization.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Model quantization options and iOS memory profiling techniques need validation during implementation. Consider `/gsd:research-phase` for download resumption patterns.
- **Phase 3:** Memory decay algorithms and relevance scoring may need iteration. Consider researching semantic similarity approaches if keyword matching proves insufficient.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Chat UI, streaming text, and speech-to-text are well-documented React Native patterns.
- **Phase 4:** App Store submission and onboarding flows have extensive documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Locked choices validated against official docs (Expo, llama.rn, MMKV). All libraries actively maintained. |
| Features | HIGH | Competitor analysis comprehensive. Feature prioritization clear. Anti-features identified. |
| Architecture | HIGH | Patterns sourced from llama.rn examples, MMKV docs, and established React Native patterns. |
| Pitfalls | HIGH | Critical pitfalls verified with multiple sources including legal requirements (SB 243, NY law). |

**Overall confidence:** HIGH

### Gaps to Address

- **Model selection finalization:** Research assumes Llama 3.2 3B Q4_K_M but actual memory/performance testing needed in Phase 1. May need to fall back to 1B for devices <6GB RAM.
- **Crisis detection accuracy:** Regex-based detection is a starting point. Accuracy against real crisis expression datasets needs validation.
- **Memory decay parameters:** Decay rate constants (7-day half-life, importance thresholds) are starting points requiring tuning.
- **Token estimation accuracy:** 4 chars/token is rough estimate. May need actual tokenizer integration if budget enforcement proves inaccurate.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - SDK features, React Native 0.81 support
- [llama.rn GitHub](https://github.com/mybigday/llama.rn) - v0.9.1 requirements, API documentation
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) - V4 API, Nitro Modules requirement
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) - AI transparency, health app requirements
- [California SB 243](https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law) - Crisis support legal requirements

### Secondary (MEDIUM confidence)
- Competitor apps (Pi, Replika, Wysa, Woebot, How We Feel, Reflectly) - Feature landscape analysis
- [Nature: Mental Health Chatbots](https://www.nature.com/articles/s41598-025-17242-4) - Crisis detection research
- [MIT: AI Chatbot Psychosocial Effects](https://www.media.mit.edu/publications/how-ai-and-human-behaviors-shape-psychosocial-effects-of-chatbot-use-a-longitudinal-controlled-study/) - Emotional dependency research
- [Surfshark AI Companion Privacy Research](https://surfshark.com/research/chart/ai-companion-apps) - Privacy statistics (91% would pay for local processing)

### Tertiary (LOW confidence, needs validation)
- Token estimation heuristics (4 chars/token) - validate with actual tokenizer
- Memory decay parameters - starting values requiring tuning

---
*Research completed: 2026-01-16*
*Ready for roadmap: yes*
