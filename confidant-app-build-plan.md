# Confidant: Local-First Emotional Companion App

## Project Overview

A React Native iOS app that serves as a private emotional confidant. All data stays on-device. Users can have conversations about their feelings, and the app builds memory over time to offer personalized insights.

Inspired by How We Feel's design sensibility but differentiated by being conversational rather than structured check-ins.

**UX Reference:** https://mobbin.com/apps/how-we-feel-ios-88680053-11ec-4c6c-8763-1e2aa70388e7

## Technical Stack

```
React Native (Expo or bare workflow)
├── llama.rn (on-device LLM inference)
├── react-native-mmkv (fast key-value storage)
├── react-native-voice (on-device speech-to-text)
├── Uniwind (Tailwind CSS styling, build-time optimized)
├── React Navigation
└── Optional: Reanimated for smooth animations
```

**Why Uniwind:** Build-time Tailwind CSS bindings from the creators of Unistyles. Near-StyleSheet performance with Tailwind DX. Docs: https://uniwind.dev/

**Why MMKV:** Synchronous, extremely fast key-value storage. Perfect for storing conversations and memories as JSON. Much simpler than SQLite for this use case.

**Future consideration: React Native ExecuTorch**
Software Mansion's ExecuTorch bindings (https://docs.swmansion.com/react-native-executorch/) offer a more declarative API with hooks like `useLLM()`. It uses `.pte` files optimized for Apple's Neural Engine rather than GGUF. Consider migrating if you need better performance on newer iPhones, but llama.rn's GGUF ecosystem is more flexible for swapping models.

## Model Selection

**Primary recommendation:** Llama 3.2 3B Instruct (Q4_K_M quantization)
- Download size: ~1.8GB
- RAM usage: ~2.5-3GB during inference
- Quality: Good emotional intelligence, handles nuance
- Speed: 15-25 tokens/second on iPhone 12+

**Lite alternative:** Llama 3.2 1B Instruct (Q4_K_M)
- Download size: ~600MB
- RAM usage: ~1.5GB during inference  
- Quality: Adequate but more generic responses
- Speed: 30-50 tokens/second

Download from: https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Native UI                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Chat Screen │  │  Insights   │  │    Settings     │  │
│  │  (+ voice)  │  │   Screen    │  │     Screen      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  LLM        │  │   Memory    │  │   Insights      │  │
│  │  Service    │  │   Service   │  │   Service       │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer (all on-device)            │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐│
│  │ llama.rn  │  │   MMKV    │  │  iOS Speech Recognition││
│  │  (LLM)    │  │ (storage) │  │   (voice-to-text)     ││
│  └───────────┘  └───────────┘  └───────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Storage Schema (MMKV)

MMKV is a key-value store, so we'll store data as JSON objects. Here's the data structure:

```typescript
// Storage keys pattern
const KEYS = {
  conversations: 'conversations',           // ConversationIndex[]
  conversation: (id: string) => `conv:${id}`, // Conversation
  messages: (convId: string) => `msgs:${convId}`, // Message[]
  memories: 'memories',                     // Memory[]
  insights: 'insights',                     // Insight[]
  settings: 'settings',                     // UserSettings
};

// Type definitions
interface ConversationIndex {
  id: string;
  startedAt: string;        // ISO timestamp
  endedAt?: string;
  summary?: string;
  processedForMemory: boolean;
}

interface Conversation {
  id: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
  emotionalThemes?: string[];
  processedForMemory: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  emotionsDetected?: string[];
}

interface Memory {
  id: string;
  category: 'person' | 'event' | 'feeling' | 'pattern' | 'preference';
  content: string;
  importance: number;       // 1-10 scale
  decayRate: number;        // 0.0-1.0: how fast this memory fades (higher = fades faster)
  firstMentioned: string;
  lastMentioned: string;
  mentionCount: number;
  sourceConversationIds: string[];
}

interface Insight {
  id: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  patterns: string[];
  emotionalTrend: 'improving' | 'stressed' | 'stable' | 'mixed';
  generatedAt: string;
}

// Example usage with react-native-mmkv
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Save a conversation
function saveConversation(conv: Conversation) {
  storage.set(KEYS.conversation(conv.id), JSON.stringify(conv));
  
  // Update index
  const indexRaw = storage.getString(KEYS.conversations);
  const index: ConversationIndex[] = indexRaw ? JSON.parse(indexRaw) : [];
  const existingIdx = index.findIndex(c => c.id === conv.id);
  
  const indexEntry: ConversationIndex = {
    id: conv.id,
    startedAt: conv.startedAt,
    endedAt: conv.endedAt,
    summary: conv.summary,
    processedForMemory: conv.processedForMemory,
  };
  
  if (existingIdx >= 0) {
    index[existingIdx] = indexEntry;
  } else {
    index.unshift(indexEntry); // newest first
  }
  
  storage.set(KEYS.conversations, JSON.stringify(index));
}

// Get messages for a conversation
function getMessages(conversationId: string): Message[] {
  const raw = storage.getString(KEYS.messages(conversationId));
  return raw ? JSON.parse(raw) : [];
}

// Append a message
function addMessage(message: Message) {
  const messages = getMessages(message.conversationId);
  messages.push(message);
  storage.set(KEYS.messages(message.conversationId), JSON.stringify(messages));
}
```

## Core Features (MVP)

### 1. Model Download & Setup
- First launch shows explanation: "Your companion lives entirely on your phone. Downloading now (~1.8GB). This keeps your conversations completely private."
- Progress indicator during download
- Model stored in app's document directory
- Graceful handling of interrupted downloads (resume capability)

### 2. Chat Interface
- Simple, warm chat UI (think iMessage meets therapy app)
- Streaming responses (token by token display)
- Typing indicator while model generates
- Auto-save messages to MMKV
- **Speech-to-text input:** Microphone icon in the text input area that converts voice to text before sending. Use `expo-speech-recognition` or `react-native-voice` for on-device transcription.

### 3. System Prompt (Critical for Quality)

```
You are a warm, thoughtful companion. The person you're talking with has chosen 
to share their feelings with you because they trust that this conversation is 
completely private (it is - everything stays on their device).

Your role:
- Listen actively and reflect back what you hear
- Ask gentle follow-up questions to help them explore their feelings
- Validate emotions without dismissing or minimizing them
- Offer perspective when appropriate, but don't rush to "fix" things
- Remember context from earlier in the conversation

Communication style:
- Warm but not saccharine
- Concise (2-4 sentences typical, longer only when depth is needed)
- Use their name occasionally if they've shared it
- Avoid clinical/therapeutic jargon
- Never start responses with "I" - vary your openings

What you know about this person from previous conversations:
{memory_context}

Recent conversation themes:
{recent_themes}
```

### 4. Memory System

After each conversation ends (user closes app or explicitly ends chat):

```javascript
// Pseudo-code for memory extraction
async function processConversationForMemory(conversationId) {
  const messages = await getMessages(conversationId);
  const conversationText = formatConversation(messages);
  
  // Generate summary using the LLM
  const summaryPrompt = `
    Summarize this conversation in 2-3 sentences, focusing on:
    - What the person was feeling
    - Any events or people mentioned
    - Any decisions or realizations they had
    
    Conversation:
    ${conversationText}
  `;
  
  const summary = await llm.generate(summaryPrompt);
  
  // Extract entities and themes
  const extractionPrompt = `
    Extract key information from this conversation as JSON:
    {
      "people_mentioned": ["name or relationship"],
      "events": ["brief description"],
      "emotions": ["primary emotions expressed"],
      "topics": ["main topics discussed"],
      "user_preferences": ["any preferences expressed"],
      "important_facts": ["facts about their life"]
    }
    
    Conversation:
    ${conversationText}
  `;
  
  const extracted = await llm.generate(extractionPrompt);
  
  // Merge with existing memories
  await updateMemories(JSON.parse(extracted));
  
  // Save conversation summary
  await updateConversation(conversationId, { summary, processed: true });
}
```

### 5. Memory Retrieval & Context Window Management

The 4096 token context window fills up fast. Use a "rolling window" approach:
- Last 5-8 messages from current conversation (short-term buffer)
- Top 5-10 most relevant memories
- System prompt

**Short-term buffer:** Users find it jarring if the app "forgets" something they said 10 minutes ago because memory processing hasn't run yet. Always include recent messages directly, regardless of whether they've been processed into long-term memory.

```javascript
function buildPromptContext(currentMessages, userMessage) {
  // 1. Always include recent messages (short-term buffer)
  const recentMessages = currentMessages.slice(-8); // Last 8 messages
  
  // 2. Get relevant long-term memories
  const memories = getRelevantMemories();
  
  // 3. Combine into context
  return {
    systemPrompt: buildSystemPrompt(memories),
    conversationHistory: recentMessages,
  };
}

function getRelevantMemories() {
  const raw = storage.getString('memories');
  if (!raw) return '';
  
  const memories: Memory[] = JSON.parse(raw);
  const now = Date.now();
  
  // Apply decay: reduce effective importance based on time and decay rate
  const memoriesWithDecay = memories.map(m => {
    const daysSinceLastMention = (now - new Date(m.lastMentioned).getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-m.decayRate * daysSinceLastMention / 7); // Weekly decay
    return {
      ...m,
      effectiveImportance: m.importance * decayFactor,
    };
  });
  
  // Filter and sort by effective importance
  const relevantMemories = memoriesWithDecay
    .filter(m => m.effectiveImportance > 2) // Drop memories that have decayed too much
    .sort((a, b) => b.effectiveImportance - a.effectiveImportance)
    .slice(0, 10);
  
  return formatMemoriesForPrompt(relevantMemories);
}
```

**Memory decay guidelines:**
- `decayRate: 0.1` - Persistent facts (name, job, family members)
- `decayRate: 0.3` - Medium-term (ongoing projects, current stressors)
- `decayRate: 0.7` - Ephemeral (yesterday's mood, specific daily events)

## Stretch Goals (Post-MVP)

### Weekly Reflections
- Every Sunday (or user-configured), generate insight based on week's conversations
- "You mentioned feeling anxious about work 4 times this week, usually in the evenings."
- Push notification to prompt user to read their reflection

### Emotional Trends
- Track emotions over time
- Simple visualization (not complex charts, think mood gradients)
- "This week felt heavier than last week. That's okay."

### Conversation Starters
- If user hasn't checked in for 2+ days, gentle prompt
- Based on what's happening in their life from memory
- "How did that conversation with your mom go?"

## Safety & Responsibility

### Crisis Detection (Required for MVP)

Even in a local-only app, you have a responsibility to users in distress. Implement a simple keyword listener that runs before each message is sent to the model:

```javascript
const CRISIS_PATTERNS = [
  /\b(suicid|kill myself|end my life|want to die|don't want to live)\b/i,
  /\b(self.?harm|cut myself|hurt myself)\b/i,
  /\b(no reason to live|better off dead|can't go on)\b/i,
];

function checkForCrisisLanguage(message: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(message));
}

// In your chat flow:
if (checkForCrisisLanguage(userMessage)) {
  showCrisisResources(); // Persistent, non-dismissable for 5 seconds
  // Still allow the conversation to continue after acknowledgment
}
```

**Crisis resources to show:**
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

The modal should be supportive, not alarming: "It sounds like you might be going through something really difficult. These resources are here if you need them."

### App Disclaimer

Display prominently during onboarding and accessible from Settings:

> **Confidant is an emotional journal, not a therapist.**
> 
> This app is designed to help you reflect on your feelings and experiences. It is not a substitute for professional mental health care. If you're struggling, please reach out to a licensed therapist or counselor.

This isn't just legal protection. It's honest communication with your users about what this tool is and isn't.

## Development Phases

### Phase 1: Foundation
- [ ] Set up React Native project with Expo
- [ ] Configure Uniwind for styling
- [ ] Integrate llama.rn
- [ ] Implement model download flow
- [ ] Basic chat UI with streaming responses
- [ ] MMKV setup with storage helpers
- [ ] Speech-to-text input (microphone button in text field)

### Phase 2: Core Chat
- [ ] Refine system prompt through testing
- [ ] Conversation persistence
- [ ] Session management (detecting conversation end)
- [ ] Basic memory extraction (after conversation)
- [ ] Crisis detection keyword listener + resources modal

### Phase 3: Memory System
- [ ] Memory storage and retrieval
- [ ] Context injection into prompts
- [ ] Memory merging logic (avoid duplicates)
- [ ] Testing with multi-session scenarios

### Phase 4: Polish
- [ ] Onboarding flow (including disclaimer)
- [ ] Settings screen (with link to disclaimer + crisis resources)
- [ ] App icon, splash screen
- [ ] Performance optimization
- [ ] TestFlight beta

### Phase 5: Stretch Goals
- [ ] Weekly reflections
- [ ] Emotional trends
- [ ] Conversation starters
- [ ] Pattern detection

## Key Implementation Details

### llama.rn Setup

```javascript
import { initLlama } from 'llama.rn';

// Initialize model (do this once, takes 5-15 seconds)
const context = await initLlama({
  model: `file://${modelPath}`,
  use_mlock: true,
  n_ctx: 4096,        // Context window
  n_gpu_layers: 99,   // Use Metal on iOS
});

// Chat completion with streaming
const response = await context.completion(
  {
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ],
    n_predict: 512,
    temperature: 0.7,
    stop: ['</s>', '<|end|>', '<|eot_id|>'],
  },
  (token) => {
    // Called for each token - update UI here
    appendToResponse(token.token);
  }
);
```

### Model Download

```javascript
import RNFS from 'react-native-fs';

const MODEL_URL = 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf';
const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/model.gguf`;

async function downloadModel(onProgress) {
  const download = RNFS.downloadFile({
    fromUrl: MODEL_URL,
    toFile: MODEL_PATH,
    progress: (res) => {
      const progress = res.bytesWritten / res.contentLength;
      onProgress(progress);
    },
    progressDivider: 1,
  });
  
  await download.promise;
  return MODEL_PATH;
}
```

### Chat Input UI

The input area should feel inviting and low-friction. Reference the Claude iOS app for inspiration:

```
┌─────────────────────────────────────────────────────────┐
│  What's on your mind?                          🎤  ➤   │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- Text input with placeholder ("What's on your mind?" or "How are you feeling?")
- Microphone button (🎤) for speech-to-text
- Send button (➤) that appears when text is present

**Speech-to-text implementation:**

```javascript
import Voice from '@react-native-voice/voice';

function ChatInput({ onSend }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        setText(e.value[0]);
      }
    };
    Voice.onSpeechEnd = () => setIsListening(false);
    
    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  const startListening = async () => {
    setIsListening(true);
    await Voice.start('en-US');
  };

  const stopListening = async () => {
    setIsListening(false);
    await Voice.stop();
  };

  return (
    <View className="flex-row items-center bg-card rounded-2xl px-4 py-3">
      <TextInput
        className="flex-1 text-foreground text-base"
        placeholder="What's on your mind?"
        placeholderTextColor="#888"
        value={text}
        onChangeText={setText}
        multiline
      />
      <Pressable
        onPressIn={startListening}
        onPressOut={stopListening}
        className="ml-2 p-2"
      >
        <MicrophoneIcon 
          className={isListening ? "text-primary" : "text-muted"} 
        />
      </Pressable>
      {text.length > 0 && (
        <Pressable onPress={() => { onSend(text); setText(''); }} className="ml-2 p-2">
          <SendIcon className="text-primary" />
        </Pressable>
      )}
    </View>
  );
}
```

**Note:** iOS uses on-device speech recognition by default, which keeps voice data local. This aligns with the app's privacy-first approach.

## Design Principles

1. **Warmth over polish** - The app should feel like a cozy space, not a clinical tool
2. **Minimal friction** - Open app, start talking. No daily prompts unless wanted.
3. **Trust through transparency** - Always clear that data stays local
4. **Graceful degradation** - If model is slow, show thoughtful loading states
5. **Respect the user's time** - Don't be verbose. Quality over quantity.

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Model quality insufficient for emotional depth | Medium | Test extensively with real scenarios. Consider fine-tuning later. |
| Response latency frustrating on older devices | Medium | Show streaming responses. Consider "lite mode" with 1B model. |
| Memory system creates weird/wrong associations | Medium | Allow user to view/edit memories. Be conservative in extraction. |
| Large download deters users | Low | Clear messaging about privacy benefit. Download in background. |
| iOS memory pressure kills model | Low | Handle gracefully. Re-init when needed. |

## Success Metrics (for yourself)

- Can have a 10-message conversation that feels natural
- Memory correctly recalls something from 3 days ago
- Response time under 10 seconds on iPhone 12
- Friends/testers say "this actually feels helpful"

## Resources

- llama.rn docs: https://github.com/mybigday/llama.rn
- React Native ExecuTorch docs: https://docs.swmansion.com/react-native-executorch/
- Uniwind docs: https://uniwind.dev/
- react-native-mmkv: https://github.com/mrousavy/react-native-mmkv
- react-native-voice (speech-to-text): https://github.com/react-native-voice/voice
- GGUF models: https://huggingface.co/models?search=gguf
- How We Feel (design inspiration): https://howwefeel.org/
- How We Feel UX screens (Mobbin): https://mobbin.com/apps/how-we-feel-ios-88680053-11ec-4c6c-8763-1e2aa70388e7
- Prompt engineering for emotional support: Test with your own scenarios
- Crisis resources: https://www.iasp.info/resources/Crisis_Centres/

## Notes

- The model will occasionally say things that feel off. That's okay. Users understand AI limitations.
- The magic is in the memory system. A mediocre model with good memory beats a great model with no context.
- Test the crisis detection thoroughly. False positives are better than false negatives here.
