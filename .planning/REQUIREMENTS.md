# Requirements: Confidant

**Defined:** 2026-01-16
**Core Value:** Memory system that makes conversations feel continuous across sessions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Model Infrastructure

- [ ] **MODEL-01**: App downloads LLM model (~1.8GB) with visible progress indicator
- [ ] **MODEL-02**: Download can be paused and resumed if interrupted
- [ ] **MODEL-03**: App initializes model and handles initialization errors gracefully
- [ ] **MODEL-04**: App monitors memory pressure and degrades gracefully when iOS needs RAM
- [ ] **MODEL-05**: Model state persists across app launches (no re-download needed)

### Chat Experience

- [ ] **CHAT-01**: User can send text messages and receive AI responses
- [ ] **CHAT-02**: AI responses stream token-by-token as they generate
- [ ] **CHAT-03**: Typing indicator shows while model generates response
- [ ] **CHAT-04**: User can tap microphone to speak instead of type (speech-to-text)
- [ ] **CHAT-05**: Speech recognition runs on-device (no cloud transcription)
- [ ] **CHAT-06**: Messages persist to local storage and survive app restart
- [ ] **CHAT-07**: User can view conversation history
- [ ] **CHAT-08**: App detects when conversation ends (app background or explicit end)
- [ ] **CHAT-09**: System prompt creates warm, empathetic AI personality

### Memory System

- [ ] **MEM-01**: After conversation ends, app extracts key information (people, events, emotions, facts)
- [ ] **MEM-02**: Extracted memories store with importance scores
- [ ] **MEM-03**: Memories have decay rates (persistent facts decay slowly, ephemeral events decay quickly)
- [ ] **MEM-04**: When building prompts, app retrieves relevant memories based on recency and importance
- [ ] **MEM-05**: System prompt includes relevant memories for conversation continuity
- [ ] **MEM-06**: Context window management keeps prompts under 4096 tokens

### Safety

- [ ] **SAFE-01**: App scans user messages for crisis language before sending to model
- [ ] **SAFE-02**: Crisis detection triggers modal with hotline numbers (988, Crisis Text Line)
- [ ] **SAFE-03**: Crisis modal is non-dismissable for 5 seconds
- [ ] **SAFE-04**: User can continue conversation after acknowledging crisis resources
- [ ] **SAFE-05**: App includes disclaimer that it's not therapy (shown in onboarding)
- [ ] **SAFE-06**: Disclaimer accessible from settings screen

### Polish

- [ ] **POLISH-01**: First launch shows onboarding flow explaining privacy and local-only approach
- [ ] **POLISH-02**: Onboarding collects user's name for personalized responses
- [ ] **POLISH-03**: Onboarding displays and requires acknowledgment of disclaimer
- [ ] **POLISH-04**: Settings screen provides access to crisis resources
- [ ] **POLISH-05**: Settings screen allows user to clear all data
- [ ] **POLISH-06**: App has custom icon and splash screen
- [ ] **POLISH-07**: App ready for TestFlight distribution

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Insights & Trends

- **INSIGHT-01**: App generates weekly reflection based on conversations
- **INSIGHT-02**: Weekly reflection surfaces patterns (e.g., "You mentioned work stress 4 times")
- **INSIGHT-03**: User can view emotional trends over time (simple visualization)
- **INSIGHT-04**: Push notification prompts user to read weekly reflection

### Engagement

- **ENGAGE-01**: If user hasn't checked in for 2+ days, app sends gentle prompt
- **ENGAGE-02**: Conversation starters based on what's happening in user's life from memory
- **ENGAGE-03**: User can configure notification preferences

### Advanced Memory

- **ADVMEM-01**: User can view stored memories
- **ADVMEM-02**: User can edit or delete specific memories
- **ADVMEM-03**: Memory merging logic prevents duplicates

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud sync | Destroys privacy value proposition; conflicts with local-first architecture |
| User accounts | Unnecessary for local-only app; adds complexity |
| Social sharing | Conflicts with confidant positioning; privacy concerns |
| Android support | iOS-first strategy; may revisit after v1 validation |
| Gamification (streaks, badges) | Mental health isn't a game; can create anxiety |
| Professional therapist integration | Scope creep; regulatory complexity; liability |
| Romantic AI features | Ethical concerns; reputation risk |
| Real-time voice conversation | High complexity; focus on voice input with text output for v1 |
| HealthKit integration | Scope creep; defer to v2+ |
| Multiple conversation threads | Added complexity; single thread sufficient for v1 |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODEL-01 | Phase 1 | Pending |
| MODEL-02 | Phase 1 | Pending |
| MODEL-03 | Phase 1 | Pending |
| MODEL-04 | Phase 1 | Pending |
| MODEL-05 | Phase 1 | Pending |
| CHAT-01 | Phase 2 | Pending |
| CHAT-02 | Phase 2 | Pending |
| CHAT-03 | Phase 2 | Pending |
| CHAT-04 | Phase 2 | Pending |
| CHAT-05 | Phase 2 | Pending |
| CHAT-06 | Phase 2 | Pending |
| CHAT-07 | Phase 2 | Pending |
| CHAT-08 | Phase 2 | Pending |
| CHAT-09 | Phase 2 | Pending |
| MEM-01 | Phase 3 | Complete |
| MEM-02 | Phase 3 | Complete |
| MEM-03 | Phase 3 | Complete |
| MEM-04 | Phase 3 | Complete |
| MEM-05 | Phase 3 | Complete |
| MEM-06 | Phase 3 | Complete |
| SAFE-01 | Phase 2 | Pending |
| SAFE-02 | Phase 2 | Pending |
| SAFE-03 | Phase 2 | Pending |
| SAFE-04 | Phase 2 | Pending |
| SAFE-05 | Phase 4 | Pending |
| SAFE-06 | Phase 4 | Pending |
| POLISH-01 | Phase 4 | Pending |
| POLISH-02 | Phase 4 | Pending |
| POLISH-03 | Phase 4 | Pending |
| POLISH-04 | Phase 4 | Pending |
| POLISH-05 | Phase 4 | Pending |
| POLISH-06 | Phase 4 | Pending |
| POLISH-07 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-01-16*
*Last updated: 2026-01-16 after roadmap creation*
