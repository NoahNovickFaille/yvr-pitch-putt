# Roadmap

**Project:** Confidant
**Created:** 2026-01-16
**Phases:** 4

## Overview

This roadmap delivers Confidant in four phases ordered by technical dependency and risk. Foundation establishes model infrastructure and storage (highest-risk technical challenges). Core Chat builds the primary user interaction including safety features. Memory System implements the core differentiator (conversation continuity). Polish adds onboarding, settings, and App Store preparation. Each phase delivers a verifiable capability.

## Phases

### Phase 1: Foundation

**Goal:** App can download, store, and initialize the on-device LLM with graceful handling of memory pressure and network failures
**Depends on:** Nothing (first phase)
**Requirements:** MODEL-01, MODEL-02, MODEL-03, MODEL-04, MODEL-05

**Success Criteria:**
1. User sees download progress indicator and can pause/resume download
2. Model file persists across app restarts without re-downloading
3. Model initializes successfully and app remains stable under iOS memory pressure
4. Initialization errors display helpful user-facing messages (not crashes)

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Create Expo project with dependencies and config
- [x] 01-02-PLAN.md — Download service with pause/resume and MMKV persistence
- [x] 01-03-PLAN.md — LLM service with memory pressure handling
- [ ] 01-04-PLAN.md — Setup screen UI with visual verification

---

### Phase 2: Core Chat

**Goal:** User can have a natural conversation with the AI companion including voice input and crisis safety features
**Depends on:** Phase 1 (requires initialized model)
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, SAFE-01, SAFE-02, SAFE-03, SAFE-04

**Success Criteria:**
1. User can send messages and see AI responses streaming token-by-token
2. User can tap microphone, speak, and see transcribed text appear in input
3. Messages persist and are visible after app restart
4. Crisis language triggers non-dismissable modal with hotline resources before AI responds
5. AI personality feels warm and empathetic (qualitative: "sounds like someone who cares")

**Plans:** 7 plans

Plans:
- [ ] 02-01-PLAN.md — Define chat types and empathetic system prompt
- [ ] 02-02-PLAN.md — Create crisis detection with keyword matching
- [ ] 02-03-PLAN.md — Integrate on-device speech recognition
- [ ] 02-04-PLAN.md — Create chat store with MMKV persistence
- [ ] 02-05-PLAN.md — Create ChatService with streaming and crisis detection
- [ ] 02-06-PLAN.md — Build chat UI components and crisis modal
- [ ] 02-07-PLAN.md — Integrate ChatScreen and add navigation

---

### Phase 3: Memory System

**Goal:** Conversations feel continuous across sessions through intelligent memory extraction and retrieval
**Depends on:** Phase 2 (requires working conversations to extract from)
**Requirements:** MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06

**Success Criteria:**
1. After conversation ends, app extracts and stores key information (people, events, emotions)
2. In new conversation, AI references relevant details from previous sessions
3. Memory from 3+ days ago still surfaces when contextually relevant
4. Prompts stay under 2048 tokens even with extensive memory and long conversations
5. Recent important information takes priority over old ephemeral details

**Plans:** 6 plans

Plans:
- [x] 03-01-PLAN.md — Define memory types and extraction prompt with JSON schema
- [x] 03-02-PLAN.md — Create memory decay calculations and Zustand store with MMKV
- [x] 03-03-PLAN.md — Create LLM-based memory extractor service
- [x] 03-04-PLAN.md — Create memory orchestrator and conversation end detection hook
- [x] 03-05-PLAN.md — Integrate memories into ChatService with token budget management
- [x] 03-06-PLAN.md — Integrate memory system into app and verify end-to-end

---

### Phase 4: Polish

**Goal:** App is complete with onboarding, settings, and ready for TestFlight distribution
**Depends on:** Phase 3 (requires working app to demonstrate in onboarding)
**Requirements:** POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06, POLISH-07, SAFE-05, SAFE-06

**Success Criteria:**
1. First launch guides user through privacy explanation, name collection, and disclaimer acknowledgment
2. Settings screen provides access to crisis resources and clear-all-data option
3. App displays custom icon and splash screen
4. App passes TestFlight review and is installable by beta testers
5. Disclaimer is visible in both onboarding flow and settings screen

**Plans:** 4 plans

Plans:
- [ ] 04-01-PLAN.md — Onboarding flow with privacy, name, and disclaimer
- [ ] 04-02-PLAN.md — Settings screen with crisis resources and data management
- [ ] 04-03-PLAN.md — App assets and TestFlight submission

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1 - Foundation | In Progress | 3/4 plans |
| 2 - Core Chat | Planned | - |
| 3 - Memory System | ✓ Complete | 6/6 plans |
| 4 - Polish | Planned | 0/3 plans |

---

*Roadmap for milestone: v1.0*
