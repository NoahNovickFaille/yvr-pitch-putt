# Feature Research

**Domain:** Emotional Companion / AI Journaling / Mental Wellness Apps
**Researched:** 2026-01-16
**Confidence:** HIGH

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Conversational AI chat** | Core value prop of companion apps; Pi, Replika, Woebot all have this | HIGH | Requires LLM integration, streaming responses, natural dialogue flow |
| **Mood/emotion check-ins** | How We Feel, Reflectly, Wysa all center on this; users expect to log how they feel | MEDIUM | Can be simple picker (emoji/word) or sophisticated emotion wheel |
| **Chat history persistence** | Users expect to scroll back through past conversations | LOW | Basic local storage, list view |
| **Basic settings/preferences** | Every app has customization; users expect control over their experience | LOW | Theme, notifications, data management |
| **24/7 availability** | Core differentiator vs human therapy; Replika, Wysa emphasize "always there" | LOW | Local-first architecture naturally provides this |
| **Privacy/data security** | Mental health data is extremely sensitive; 78% of users refuse cloud AI features | MEDIUM | Encryption at rest, secure storage, clear privacy policy |
| **Empathetic tone/responses** | Pi built entire company around this; users expect emotional intelligence, not robotic | HIGH | Depends on model quality and prompt engineering |
| **Onboarding flow** | Mental wellness apps use progressive onboarding to personalize experience | MEDIUM | Goal setting, baseline assessment, feature introduction |
| **Crisis/safety resources** | Wysa is only app with all 5 crisis support types; basic safety is legally/ethically essential | MEDIUM | Hotline numbers, detection of crisis language, appropriate escalation |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Memory system (conversation continuity)** | Cove's core differentiator; makes AI feel like it "knows you" across sessions | HIGH | Requires memory extraction, storage, retrieval, and context injection |
| **Fully local/private (no cloud)** | 91% would pay more for on-device processing; addresses massive privacy concerns | HIGH | On-device LLM, local-only data, no network required |
| **Voice input (speech-to-text)** | Reflectly, Untold, Lid offer voice journaling; lowers friction significantly | MEDIUM | Apple Speech framework is mature; transcription accuracy is good |
| **Conversational (not structured check-ins)** | Pi differentiates from Woebot/Wysa's structured approach; feels more natural | HIGH | Prompt engineering, conversation flow design |
| **Pattern recognition over time** | Rosebud, AudioDiary identify patterns across weeks/months; provides unique insights | HIGH | Requires significant conversation history analysis |
| **Personalized AI that learns** | Replika emphasizes "becomes yours over time"; deepens relationship | HIGH | Memory system + preference learning + response adaptation |
| **Offline-first functionality** | Local-first apps work anywhere; no connectivity anxiety | MEDIUM | Architecture decision; affects all data flows |
| **Streaming responses** | Modern expectation from ChatGPT; shows AI is "thinking" | MEDIUM | Requires streaming token generation from local model |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Cloud sync across devices** | Convenience, backup anxiety | Destroys privacy value prop; complex architecture; security liability | Secure local backup/restore (manual export) |
| **Social sharing/friends** | How We Feel has this; social support is valuable | Conflicts with "cove" positioning; privacy concerns; adds complexity | Keep private; users can share screenshots if desired |
| **Gamification (streaks, badges)** | Increases engagement metrics | Mental health isn't a game; can create anxiety about "breaking streaks" | Gentle encouragement without punishment mechanics |
| **Detailed analytics dashboards** | Users think they want data | Overwhelming; can increase rumination; shifts focus from feeling to measuring | Simple, actionable insights surfaced naturally in conversation |
| **Professional therapist integration** | Wysa offers this; seems comprehensive | Scope creep; regulatory complexity; liability; not our core value | Clear disclaimer that app is not therapy; provide crisis resources |
| **Romantic/relationship AI** | Replika's monetization; high demand | Ethical concerns; reputation risk; conflicts with emotional support positioning | Warm, supportive friendship positioning only |
| **Real-time voice conversation** | Pi has excellent voice; feels more natural | HIGH complexity; battery drain; harder to do on-device well | Voice input with text output is good compromise for v1 |
| **Excessive customization** | Users want control | Analysis paralysis; delays time-to-value; maintenance burden | Thoughtful defaults with minimal, meaningful options |
| **Integration with health apps** | How We Feel does HealthKit | Scope creep; adds complexity; privacy implications | Consider for v2+ if core value proven |
| **AI-generated images/art** | Mindsera does this; visually interesting | Significant complexity; not core to emotional support; battery/performance | Focus on conversation quality first |

---

## Feature Dependencies

```
[Model Download & Setup]
    |
    v
[Basic Chat Interface] -----> [Streaming Responses]
    |
    +-----> [Voice Input (STT)] -----> [Hands-free Mode]
    |
    +-----> [Chat History Persistence]
    |            |
    |            v
    |       [Memory System] -----> [Conversation Continuity]
    |            |                        |
    |            v                        v
    |       [Pattern Recognition]   [Personalized Responses]
    |
    +-----> [Crisis Detection] -----> [Safety Resources Display]
    |
    v
[Settings & Preferences]
    |
    v
[Onboarding Flow] (wraps all above for first-run experience)
```

### Dependency Notes

- **Chat Interface requires Model**: Cannot converse without LLM loaded
- **Memory System requires Chat History**: Must persist conversations to extract memories
- **Conversation Continuity requires Memory System**: Can't reference past without memory retrieval
- **Crisis Detection requires Chat**: Must analyze conversation content for safety signals
- **Voice Input enhances Chat**: STT feeds into same chat interface
- **Streaming enhances Chat**: Better UX but chat works without it
- **Onboarding wraps everything**: Introduces features progressively, depends on core being functional

---

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [x] **Model download & management** - Core infrastructure; users need to get the AI on device
- [x] **Basic chat interface with streaming** - Primary interaction mode; must feel responsive
- [x] **Voice input (speech-to-text)** - Differentiator; significantly lowers friction for emotional expression
- [x] **Chat history persistence** - Users expect to see past conversations; builds relationship feeling
- [x] **Memory system (basic)** - Core differentiator; extract and surface key information across sessions
- [x] **Crisis detection & resources** - Essential for safety; non-negotiable for mental health apps
- [x] **Onboarding flow** - Sets expectations, collects name/goals, introduces features
- [x] **Settings (basic)** - Data management, about/privacy info

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Advanced memory system** - More sophisticated extraction, better retrieval, relationship mapping
- [ ] **Mood tracking integration** - Optional check-ins that feed into memory
- [ ] **Export/backup functionality** - User data ownership, peace of mind
- [ ] **Notification/reminder system** - Gentle check-in prompts (user-controlled)
- [ ] **Theme customization** - Light/dark, accent colors

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Weekly reflections & insights** - Pattern analysis over time (explicitly out of v1 scope)
- [ ] **Emotional trends visualization** - Simple charts showing patterns (explicitly out of v1 scope)
- [ ] **Conversation starters** - AI-initiated prompts based on context (explicitly out of v1 scope)
- [ ] **HealthKit integration** - Sleep, exercise correlation
- [ ] **Widget support** - Quick check-in from home screen
- [ ] **Multiple conversation threads** - Different topics/contexts
- [ ] **iCloud backup (optional)** - Only if users explicitly opt-in, with strong encryption

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Chat with streaming | HIGH | HIGH | P1 |
| Memory system (basic) | HIGH | HIGH | P1 |
| Voice input (STT) | HIGH | MEDIUM | P1 |
| Crisis detection | HIGH | MEDIUM | P1 |
| Model download/setup | HIGH | HIGH | P1 |
| Onboarding | HIGH | MEDIUM | P1 |
| Chat history | MEDIUM | LOW | P1 |
| Settings (basic) | MEDIUM | LOW | P1 |
| Advanced memory | HIGH | HIGH | P2 |
| Export/backup | MEDIUM | LOW | P2 |
| Mood tracking | MEDIUM | MEDIUM | P2 |
| Notifications | LOW | LOW | P2 |
| Theme customization | LOW | LOW | P3 |
| Weekly reflections | MEDIUM | HIGH | P3 (v2) |
| Emotional trends | MEDIUM | HIGH | P3 (v2) |
| HealthKit integration | LOW | MEDIUM | P3 (v2+) |

**Priority key:**
- P1: Must have for launch (v1)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | How We Feel | Reflectly | Woebot | Wysa | Replika | Pi | **Cove** |
|---------|-------------|-----------|--------|------|---------|----|----|
| **Conversational AI** | No (check-in only) | Limited | Yes (scripted) | Yes (scripted) | Yes (generative) | Yes (generative) | **Yes (generative)** |
| **Memory/continuity** | Check-in history | Entry history | Limited | Limited | Yes (inconsistent) | Yes | **Yes (core focus)** |
| **Voice input** | Voice memos | Voice-to-text | No | No | Voice calls | Voice calls | **Yes (STT)** |
| **Local/private** | Cloud | Cloud | Cloud | Cloud | Cloud | Cloud | **Fully local** |
| **Emotion tracking** | Core feature | Core feature | Mood check | Mood check | Basic | Basic | **Via conversation** |
| **Crisis support** | Resources only | None | Good | Best (5 types) | Basic | Basic | **Detection + resources** |
| **Pricing** | Free | Freemium ($60/yr) | Enterprise only | Freemium ($75/yr) | Freemium (~$70/yr) | Free | **Free (local)** |
| **Offline** | Partial | No | No | No | No | No | **Yes (fully)** |
| **CBT/DBT tools** | Strategies | Prompts | Core feature | Core feature | Activities | None | **Natural conversation** |

### Competitive Positioning Summary

**Cove differentiates by:**
1. **Fully local/private** - No other major competitor offers this
2. **Memory-first design** - Conversation continuity as core value, not afterthought
3. **Conversational (not clinical)** - More like Pi's warmth, less like Woebot's structure
4. **Free (no subscription)** - Local processing means no ongoing cloud costs
5. **Offline-capable** - Works anywhere, anytime

**Cove intentionally avoids:**
1. Structured CBT/DBT programs (not therapy replacement)
2. Social features (privacy-first)
3. Gamification (mental health isn't a game)
4. Cloud sync (destroys privacy value)

---

## Sources

### Primary App Research
- [How We Feel - App Store](https://apps.apple.com/us/app/how-we-feel/id1562706384)
- [How We Feel - Official Site](https://howwefeel.org/)
- [Reflectly - App Store](https://apps.apple.com/us/app/reflectly-journal-ai-diary/id1241229134)
- [Woebot Health](https://woebothealth.com/)
- [Woebot Shutdown Announcement - STAT](https://www.statnews.com/2025/07/02/woebot-therapy-chatbot-shuts-down-founder-says-ai-moving-faster-than-regulators/)
- [Wysa - Official Site](https://www.wysa.com/for-individuals)
- [Wysa App Review 2025](https://www.choosingtherapy.com/wysa-app-review/)
- [Replika Review 2025](https://companionguide.ai/companions/replika)
- [Pi AI Review 2025](https://aicompanionguides.com/blog/30-days-with-pi-starting-empathy-experiment/)

### Feature & Privacy Research
- [AI Companion Apps Privacy - Surfshark Research](https://surfshark.com/research/chart/ai-companion-apps)
- [AI Companion Privacy - MIT Technology Review](https://www.technologyreview.com/2025/11/24/1128051/the-state-of-ai-chatbot-companions-and-the-future-of-our-privacy/)
- [California SB 243 Companion Chatbot Law Analysis](https://www.troutmanprivacy.com/2026/01/analyzing-the-new-ai-companion-chatbot-laws/)
- [AI Memory Systems Explained - Pieces](https://pieces.app/blog/types-of-ai-memory)

### Crisis Detection Research
- [Chatbot Crisis Detection Study - Nature Scientific Reports](https://www.nature.com/articles/s41598-025-17242-4)
- [Digital Suicide Prevention Tools Review - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12234914/)
- [Wysa Crisis Support Analysis](https://blogs.wysa.io/blog/research/wysa-found-to-be-only-chatbot-based-mental-health-app-with-5-types-of-crisis-support-for-users)

### Voice & Local AI Research
- [Voice Journaling Apps Review](https://journalinginsights.com/best-voice-journal-app/)
- [On-Device AI Guide 2025](https://www.f22labs.com/blogs/what-is-on-device-ai-a-complete-guide/)
- [Local AI Models Overview - Software Mansion](https://blog.swmansion.com/top-6-local-ai-models-for-maximum-privacy-and-offline-capabilities-888160243a94)

### Onboarding Research
- [Mobile App Onboarding Best Practices - Sendbird](https://sendbird.com/blog/mobile-app-onboarding)
- [Mental Health App Development Guide 2025](https://attractgroup.com/blog/mental-health-app-development-guide-develop-a-mental-health-app-in-2025/)

---

*Feature research for: Cove - Local-first iOS emotional companion app*
*Researched: 2026-01-16*
