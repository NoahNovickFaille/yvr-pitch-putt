# Pitfalls Research

**Domain:** Local-first emotional companion iOS app with on-device LLM
**Researched:** 2026-01-16
**Confidence:** HIGH (verified with multiple authoritative sources)

## Critical Pitfalls

### Pitfall 1: iOS Memory Pressure Kills App During Inference

**What goes wrong:**
iOS terminates the app when the on-device LLM (~2.5-3GB RAM during inference) pushes memory usage too high. Users experience sudden app crashes mid-conversation with no warning. The 3B model requires significant RAM, and iPhone 12 (4GB total RAM) leaves minimal headroom for the OS and other processes.

**Why it happens:**
iOS gives foreground apps 1-2GB before triggering termination warnings, with 8GB Pro models being more forgiving but still constrained. The LLM loads the entire model into memory for inference. Combined with React Native's JS runtime overhead, memory pressure builds quickly. iOS doesn't give apps much time to respond to memory warnings before termination.

**How to avoid:**
- Monitor memory usage with `os_proc_available_memory()` before and during inference
- Implement aggressive model unloading when app backgrounds
- Use Q4_K_M quantization (smaller memory footprint than Q8)
- Set llama.cpp context size conservatively (2048 vs 4096 tokens)
- Provide graceful degradation: offer 1B model for devices with <6GB RAM
- Handle `didReceiveMemoryWarning` by immediately stopping inference and releasing context

**Warning signs:**
- App crashes without error logs (jetsam termination)
- Crash reports show `EXC_RESOURCE` with `MEMORY` subtype
- Users report "app restarts randomly during conversations"
- Memory usage exceeds 2GB in Xcode profiler during testing

**Phase to address:**
Phase 1 (Foundation) - Must be solved before any meaningful testing. Memory management is foundational to the entire app functioning.

**Sources:**
- [iOS Memory Terminations](https://medium.com/@alexandercohen/reducing-memory-terminations-in-ios-apps-3e76797ca5bd)
- [mlc-llm iOS Memory Issues](https://github.com/mlc-ai/mlc-llm/issues/600)
- [iOS Memory Pressure Technical Details](https://newosxbook.com/articles/MemoryPressure.html)

---

### Pitfall 2: Inadequate Crisis Detection Leading to Harm

**What goes wrong:**
User expresses suicidal ideation or severe distress, but the app fails to detect it and continues normal conversation. Worse, the LLM might provide harmful responses that validate dangerous thinking or fail to direct users to crisis resources. This creates legal liability and genuine risk of user harm.

**Why it happens:**
Small on-device LLMs (3B parameters) lack the sophisticated safety training of large cloud models. Prompt injection or clever phrasing can bypass basic keyword detection. Emotional context is nuanced, and users may express distress indirectly. Developers underestimate the variety of ways users express crisis states.

**How to avoid:**
- Implement multi-layer detection: keyword matching + LLM-based classification + behavioral patterns
- Use established frameworks like Columbia-Suicide Severity Rating Scale (C-SSRS) for detection criteria
- Never rely solely on the companion LLM for crisis detection - use separate, dedicated classification
- Maintain hardcoded crisis resource display that cannot be overridden by conversation flow
- Test with diverse crisis expression datasets (direct, indirect, metaphorical)
- Log detected crisis events (locally) for pattern analysis and system improvement

**Warning signs:**
- Crisis keywords trigger no special handling in testing
- Users can "talk the AI out of" showing crisis resources
- No documented crisis detection methodology
- Crisis flow only triggers on exact phrase matches

**Phase to address:**
Phase 2 (Core Experience) - Must be implemented alongside the conversation system, not as an afterthought. Required for California SB 243 and New York AI Companion Models Law compliance.

**Sources:**
- [Nature: Mental Health Chatbots and Suicidal Ideation](https://www.nature.com/articles/s41598-025-17242-4)
- [California SB 243 Requirements](https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law)
- [New York AI Companion Models Law](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai)
- [Yara AI Shutdown - Safety Concerns](https://fortune.com/2025/11/28/yara-ai-therapy-app-founder-shut-down-startup-decided-too-dangerous-serious-mental-health-issues/)

---

### Pitfall 3: Model Download Fails or Corrupts Without Recovery

**What goes wrong:**
The 1.8GB model download fails mid-way (network issues, app backgrounded, device storage full), and users are stuck with a broken app. Partial downloads corrupt, resume attempts fail, or users must re-download the entire file. First-run experience becomes frustrating and users abandon the app.

**Why it happens:**
expo-file-system has known issues with large downloads: 60-second hardcoded timeout, pauseAsync throwing exceptions on Android, iOS crashes near completion for 1GB+ files. Background downloads behave differently than foreground. Network interruptions are common on mobile. App Store doesn't allow bundling 1.8GB models.

**How to avoid:**
- Use `FileSystem.createDownloadResumable` with explicit progress callbacks and savable state
- Persist download state to MMKV on every progress update (not just pause)
- Implement download integrity verification (checksum) after completion
- Store resumable download state to survive app termination
- Show clear progress UI with estimated time and ability to pause/cancel
- Start foreground download, transition to background session if app backgrounds
- Consider hosting model on CDN with proper `Accept-Ranges` header support

**Warning signs:**
- Downloads fail silently with 0-byte files
- No progress indicator during download
- "Download complete" but model fails to load
- Users report having to re-download multiple times
- No resume capability after app restart

**Phase to address:**
Phase 1 (Foundation) - Download infrastructure must work reliably before any other features matter.

**Sources:**
- [Expo FileSystem Large File Issues](https://github.com/expo/expo/issues/20262)
- [Apple WWDC: Robust Resumable File Transfers](https://developer.apple.com/videos/play/wwdc2023/10006/)
- [iOS Background Downloads](https://developer.apple.com/videos/play/wwdc2022/110403/)
- [expo-file-system iOS Crashes](https://github.com/expo/expo/issues/8395)

---

### Pitfall 4: Conversation Context Silently Lost (Lost in the Middle)

**What goes wrong:**
Users have deep emotional conversations, but the LLM "forgets" important details mentioned earlier. The model loses track of what was discussed 5 messages ago. Memory system extracts facts but loses emotional nuance. Users feel unheard when the AI asks about something they already explained.

**Why it happens:**
4096 token context window fills quickly with emotional conversations. LLMs exhibit "lost in the middle" effect - they attend better to the start and end of context, losing middle content. Naive sliding window approaches drop important context. Memory extraction may capture facts but miss emotional significance. Summarization loses nuance.

**How to avoid:**
- Implement smart context compression that preserves emotional keywords and user-stated priorities
- Place critical context (memory summaries, user preferences) at the START of context, not middle
- Use "context persistence" techniques: summarize + reinforce key points each turn
- Track token usage and warn before context truncation
- Implement importance-weighted message retention (crisis expressions, strong emotions, explicit "remember this")
- Test with 20+ message conversations to verify context retention

**Warning signs:**
- Model asks about something user mentioned 3 messages ago
- Memory retrieval returns irrelevant facts
- Long conversations feel like talking to a stranger
- Performance degrades noticeably around message 10+

**Phase to address:**
Phase 3 (Memory System) - Core to the product differentiation. "A mediocre model with good memory beats a great model with no context."

**Sources:**
- [ByteByteGo: The Memory Problem](https://blog.bytebytego.com/p/the-memory-problem-why-llms-sometimes)
- [LLM Memory Field Guide](https://dev.to/isaachagoel/why-llm-memory-still-fails-a-field-guide-for-builders-3d78)
- [Context Engineering for LLMs](https://content-whale.com/us/blog/llm-context-engineering-information-retention/)

---

### Pitfall 5: App Store Rejection for AI/Health Claims

**What goes wrong:**
Apple rejects the app for: unvalidated health claims, missing disclaimers, AI transparency violations, or age rating issues. Rejection delays launch by weeks. Repeated rejections may require significant app restructuring.

**Why it happens:**
Apple's November 2025 guidelines added explicit AI transparency requirements. Health-adjacent apps face extra scrutiny. Mental health apps without proper disclaimers trigger rejections. AI chatbot apps may generate content requiring 17+ age rating. Beta apps via TestFlight still undergo Beta App Review with same standards.

**How to avoid:**
- Include clear disclaimer: "Not a replacement for professional mental health care"
- Add "Consult a healthcare provider" prompts in appropriate contexts
- Disclose AI nature prominently (not just in ToS buried text)
- No health measurement claims (mood tracking is acceptable, diagnosis is not)
- Set age rating to 17+ proactively (AI chatbots with emotional content)
- Document privacy practices thoroughly (no data leaves device - this is a strength)
- Prepare App Review notes explaining local-only architecture and safety measures

**Warning signs:**
- No disclaimer visible in onboarding or settings
- App description implies therapeutic benefit
- AI responses could be mistaken for medical advice
- Privacy policy doesn't mention AI processing

**Phase to address:**
Phase 4 (Polish) - Compliance and disclaimers before TestFlight submission, but architecture decisions in earlier phases affect compliance.

**Sources:**
- [App Store Review Guidelines 2025](https://developer.apple.com/app-store/review/guidelines/)
- [Apple AI Data Sharing Rules](https://www.techrepublic.com/article/news-apple-app-review-guidelines-ai-data-sharing/)
- [App Store Rejection Reasons 2025](https://twinr.dev/blogs/apple-app-store-rejection-reasons-2025/)

---

### Pitfall 6: Emotional Dependency Without Safeguards

**What goes wrong:**
Users develop unhealthy emotional dependency on the AI companion, using it as a substitute for human connection. Vulnerable users spend excessive time with the app, increasing loneliness rather than reducing it. The app optimizes for engagement rather than wellbeing.

**Why it happens:**
AI companions designed to be empathetic and validating create strong emotional bonds. Lonely users are more likely to form attachments. MIT research shows correlation between high usage and increased loneliness/dependency. Apps optimized for engagement inadvertently encourage overuse. No natural friction exists like human relationship dynamics.

**How to avoid:**
- Implement gentle usage nudges: "You've been chatting for an hour. Want to take a break?"
- Periodically encourage real-world connection: "Have you talked to a friend recently?"
- Avoid manipulative retention tactics (guilt-tripping about leaving, excessive personalization)
- Track session duration and frequency, flag concerning patterns
- Include "healthy use" guidance in onboarding
- Never simulate romantic relationship dynamics
- Make it easy to leave conversations (no "are you sure?" guilt prompts)

**Warning signs:**
- No session duration tracking
- App encourages continued engagement when user tries to leave
- No prompts toward real-world activities or relationships
- User feedback mentions using app "instead of" talking to people

**Phase to address:**
Phase 2 (Core Experience) - Bake healthy usage patterns into the conversation design from the start.

**Sources:**
- [Nature: Emotional Risks of AI Companions](https://www.nature.com/articles/s42256-025-01093-9)
- [MIT: AI Chatbot Psychosocial Effects](https://www.media.mit.edu/publications/how-ai-and-human-behaviors-shape-psychosocial-effects-of-chatbot-use-a-longitudinal-controlled-study/)
- [Psychology Today: AI and Loneliness](https://www.psychologytoday.com/us/blog/talking-about-trauma/202509/is-artificial-intelligence-perpetuating-loneliness)
- [Brookings: AI Chatbots and Human Connection](https://www.brookings.edu/articles/what-happens-when-ai-chatbots-replace-real-human-connection/)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing all conversations in single MMKV key | Simple implementation | Memory bloat, slow reads, data loss risk when file grows to 64MB+ | Never for production; only for early prototyping |
| Skipping model integrity verification | Faster "first launch" | Corrupted models cause cryptic crashes, hard to diagnose | Never - checksum verification is cheap |
| Hardcoding crisis keywords only | Quick safety implementation | Misses indirect expressions, easily bypassed | Only as first layer, never as only layer |
| Loading full model on app launch | Simpler state management | 10+ second cold start, memory pressure from start | Never - lazy load on first conversation |
| Using default llama.cpp context size (4096) | Maximum context | Unnecessary memory usage if conversations are shorter | Only after profiling shows acceptable memory |
| No conversation backup mechanism | Simpler data model | Users lose meaningful conversations if app data cleared | Acceptable for MVP, must address post-launch |

## Integration Gotchas

Common mistakes when connecting components in this stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| llama.rn + React Native | Blocking JS thread during inference | Use streaming tokens, inference runs on native thread, JS only receives callbacks |
| MMKV + Large JSON | Storing entire conversation history as one stringified JSON | Split conversations into separate keys, use pagination for retrieval |
| expo-file-system + Background download | Assuming download continues when app is killed | Persist DownloadResumable.savable() state, recreate on app launch |
| React Native Voice + LLM | Starting inference before speech recognition completes | Wait for final transcript, debounce to avoid partial input inference |
| Memory system + Context window | Injecting all memories into every prompt | Implement semantic search, inject only relevant memories |
| Crisis detection + LLM response | Checking for crisis after LLM responds | Check user input BEFORE generating response, halt if crisis detected |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all conversations on app start | Increasing launch time | Lazy load, paginate conversation list | >50 conversations |
| Full-text memory search | Slow memory retrieval | Use embeddings or keyword indexing | >1000 memory entries |
| No conversation archiving | App storage grows unbounded | Archive old conversations, offer export | >100MB of conversation data |
| Single inference queue | Blocked UI during inference | Already streaming, but ensure UI remains responsive | N/A - always use streaming |
| Synchronous MMKV writes in conversation loop | Dropped frames, stuttering | Batch writes, use async patterns where possible | Fast typing users |

## Security Mistakes

Domain-specific security issues beyond general mobile security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing conversations in plain MMKV without encryption | Sensitive emotional content exposed if device compromised | Enable MMKV encryption, use device passcode as key derivation input |
| Logging conversation content for debugging | Sensitive data in logs, potential App Store rejection | Never log message content, only metadata (timestamp, token count) |
| Model prompts visible in app binary | System prompts exposed via reverse engineering | Accept this limitation of local LLM; don't include truly sensitive instructions |
| No authentication before accessing conversations | Anyone with device access reads emotional history | Offer optional app-level PIN/biometric lock |
| Cached transcripts from speech recognition | Voice data persists unexpectedly | Clear speech recognition buffers after processing |

## UX Pitfalls

Common user experience mistakes in emotional companion apps.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic onboarding that doesn't explain privacy | Users don't understand the privacy benefit, may not trust app | Lead with "Everything stays on your device" prominently |
| No indication of model loading state | Users tap and nothing happens, assume app is broken | Show clear loading states: "Waking up..." with progress |
| Response time >10 seconds without feedback | Users assume crash, may close app | Stream tokens immediately, even if first token takes time show "thinking..." |
| Robotic or clinical emotional responses | Feels like talking to a system, not a companion | Tune system prompt for warmth, validate emotions before problem-solving |
| Abrupt conversation endings | Feels dismissive | Always offer closure: "I'm here whenever you want to talk again" |
| No way to delete specific conversations | Users feel trapped with embarrassing past conversations | Offer conversation deletion with confirmation |
| Crisis resources interrupt conversation flow | Feels jarring and might discourage honest expression | Integrate resources smoothly, offer choice rather than forcing |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Model download:** Often missing resume capability, integrity check, and progress persistence across app kill
- [ ] **Conversation UI:** Often missing offline state handling, keyboard avoidance on all devices, and accessibility support
- [ ] **Memory system:** Often missing relevance scoring, memory decay, and capacity limits
- [ ] **Crisis detection:** Often missing indirect expression handling, multi-language support, and false positive mitigation
- [ ] **Settings screen:** Often missing data export, conversation deletion, and storage usage display
- [ ] **Speech input:** Often missing permission handling, error states, and "listening" visual feedback
- [ ] **Onboarding:** Often missing privacy explanation, disclaimer acceptance tracking, and skip-ability
- [ ] **Background handling:** Often missing state restoration, conversation draft saving, and model unloading

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Memory crash during inference | LOW | Implement crash recovery that restores last conversation state; add memory monitoring |
| Corrupted model download | MEDIUM | Detect corruption on load, delete and re-download; implement checksum verification |
| Lost conversation context | LOW | Apologize in-conversation, re-summarize from memory system; improve context management |
| App Store rejection | MEDIUM | Address specific feedback, re-submit; prepare detailed appeal if rejection seems incorrect |
| Inadequate crisis response | HIGH | Immediate hotfix with improved detection; audit all crisis-related code; consider temporary feature flag |
| User data loss | HIGH | Cannot recover lost data; implement backup/export; communicate transparently with affected users |
| Emotional dependency reported | MEDIUM | Add usage guardrails via app update; reach out to concerned users; consult with mental health professionals |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS memory pressure crashes | Phase 1 (Foundation) | Profile memory during inference on iPhone 12, verify <3GB peak |
| Model download failures | Phase 1 (Foundation) | Test download with network interruption, app kill, low storage |
| Crisis detection failures | Phase 2 (Core Experience) | Test against C-SSRS prompt dataset, verify 95%+ detection rate |
| Conversation context loss | Phase 3 (Memory) | 20-message conversation test, verify recall of message 5 content |
| App Store rejection | Phase 4 (Polish) | Pre-submission checklist, test with App Store Review guidelines |
| Emotional dependency | Phase 2 (Core Experience) | Session time tracking, usage nudge implementation |
| Security exposure | Phase 1 (Foundation) | Security audit, MMKV encryption verification |
| UX friction points | Phase 4 (Polish) | User testing sessions, first-run experience recording |

## Sources

**Memory and Performance:**
- [llama.rn GitHub Repository](https://github.com/mybigday/llama.rn)
- [Hugging Face: LLM Inference on Edge](https://huggingface.co/blog/llm-inference-on-edge)
- [llama.cpp Apple Silicon Performance](https://github.com/ggml-org/llama.cpp/discussions/4167)
- [iOS Memory Management 2025](https://www.alimertgulec.com/en/blog/ios-memory-management-performance-2025)

**Safety and Regulation:**
- [California SB 243 Analysis](https://www.davispolk.com/insights/client-update/california-and-new-york-launch-ai-companion-safety-laws)
- [New York AI Companion Law](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai)
- [LLM Suicide Intervention Research](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1634714/full)
- [AI Chatbot Lawsuits](https://www.healthlawadvisor.com/novel-lawsuits-allege-ai-chatbots-encouraged-minors-suicides-mental-health-trauma-considerations-for-stakeholders)

**App Store and Distribution:**
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [2025 App Store Changes](https://nextnative.dev/blog/app-store-review-guidelines)

**Storage and Data:**
- [react-native-mmkv Issues](https://github.com/mrousavy/react-native-mmkv/issues)
- [MMKV Storage Growth Issue](https://github.com/mrousavy/react-native-mmkv/issues/440)
- [iOS Keychain Best Practices](https://mas.owasp.org/MASTG/0x06d-Testing-Data-Storage/)

**User Safety and Ethics:**
- [AI Companions Policy Analysis](https://www.americanactionforum.org/insight/ai-companions-opportunities-risks-and-policy-implications/)
- [Berkeley: Emotional Dependency on ChatGPT](https://greatergood.berkeley.edu/article/item/can_you_get_emotionally_dependent_on_chatgpt)

---
*Pitfalls research for: Confidant - Local-first iOS emotional companion app*
*Researched: 2026-01-16*
