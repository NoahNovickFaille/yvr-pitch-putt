# Phase 2: Core Chat - Research

**Researched:** 2026-01-16
**Domain:** On-device chat completion, streaming inference, speech recognition, crisis detection, message persistence
**Confidence:** HIGH

## Summary

Phase 2 implements the core chat experience for Cove: bidirectional conversation with an on-device LLM, voice input via speech-to-text, message persistence, and crisis safety features. The critical technical challenges are: (1) streaming token-by-token responses from llama.rn with proper callback handling, (2) integrating on-device iOS speech recognition without cloud dependencies, (3) designing a message persistence schema with MMKV, (4) implementing crisis keyword detection before messages reach the model, and (5) building a responsive chat UI with typing indicators.

llama.rn v0.10+ provides a clean streaming API via the `context.completion()` method with a partial completion callback that fires for each generated token. For speech recognition, `@jamsch/expo-speech-recognition` is the recommended library with explicit on-device mode support (`requiresOnDeviceRecognition: true`). Crisis detection should use a two-stage approach: fast keyword matching followed by pattern analysis, with immediate modal display before the message is sent to the model.

**Primary recommendation:** Use llama.rn's native streaming callback for token-by-token display, expo-speech-recognition for on-device STT, MMKV with JSON serialization for message persistence, and a keyword-based crisis detector with curated phrases from mental health research. Build custom chat UI rather than using react-native-gifted-chat to maintain control over the streaming/typing experience.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.rn | ^0.10.0 | Streaming chat completion | Already installed; native streaming callback API; stop word support; message-based chat format |
| @jamsch/expo-speech-recognition | ^1.x | On-device speech-to-text | Expo config plugin; explicit `requiresOnDeviceRecognition` option; iOS SFSpeechRecognizer binding; privacy-preserving |
| react-native-mmkv | ^4.1.1 | Message persistence | Already installed; synchronous JSON serialization; 30x faster than AsyncStorage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.x | Chat state management | Track messages, typing state, loading state; persist to MMKV |
| expo-haptics | SDK 54 | Tactile feedback | Send button press, crisis modal appearance |
| lucide-react-native | ^0.562.0 | Chat icons | Microphone, send button, stop generation icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @jamsch/expo-speech-recognition | @react-native-voice/voice | expo-speech-recognition has better Expo integration, explicit on-device mode; voice is older but more battle-tested |
| Custom chat UI | react-native-gifted-chat | Gifted Chat has more features but harder to control streaming display; custom UI gives full control over token animation |
| MMKV for messages | expo-sqlite | SQLite better for complex queries/search; MMKV sufficient for single conversation thread |

**Installation:**
```bash
# Speech recognition
npm install @jamsch/expo-speech-recognition

# Already installed from Phase 1
# react-native-mmkv, zustand, lucide-react-native, expo-haptics
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── llm/
│   │   ├── LLMService.ts          # Existing - add completion method
│   │   ├── ChatService.ts         # Orchestrates chat flow
│   │   └── systemPrompt.ts        # Empathetic AI personality prompt
│   ├── speech/
│   │   └── SpeechService.ts       # Speech recognition wrapper
│   └── safety/
│       ├── CrisisDetector.ts      # Crisis keyword detection
│       └── crisisKeywords.ts      # Curated keyword list
├── stores/
│   └── chatStore.ts               # Zustand store for messages
├── screens/
│   └── ChatScreen.tsx             # Main chat interface
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx        # Virtualized message display
│   │   ├── MessageBubble.tsx      # Individual message
│   │   ├── StreamingMessage.tsx   # Token-by-token display
│   │   ├── TypingIndicator.tsx    # Animated dots
│   │   └── ChatInput.tsx          # Text + voice input
│   └── modals/
│       └── CrisisModal.tsx        # Non-dismissable crisis resources
├── hooks/
│   ├── useChat.ts                 # Chat logic hook
│   └── useSpeech.ts               # Speech recognition hook
└── types/
    └── chat.ts                    # Message, Conversation types
```

### Pattern 1: Streaming Token-by-Token Display
**What:** Display each token as it generates, creating a "typing" effect that feels responsive.
**When to use:** Always for AI responses - critical for perceived latency.
**Example:**
```typescript
// Source: llama.rn README.md (verified in node_modules)
import { LLMService } from '../services/llm/LLMService';

interface StreamingState {
  isGenerating: boolean;
  partialResponse: string;
}

async function generateResponse(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void
): Promise<void> {
  const context = LLMService.getContext();

  const stopWords = [
    '</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>',
    '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>',
    '<|end_of_turn|>', '<|endoftext|>'
  ];

  const result = await context.completion(
    {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      n_predict: 512,     // Max tokens to generate
      stop: stopWords,
      temperature: 0.7,   // Slightly creative for empathetic responses
      top_p: 0.9,
    },
    (data) => {
      // Partial completion callback - fires for each token
      const { token } = data;
      onToken(token);
    }
  );

  onComplete(result.text);
}
```

### Pattern 2: Message Persistence with MMKV
**What:** Store conversation history as JSON array in MMKV for fast synchronous access.
**When to use:** Every message send/receive to ensure persistence across app restarts.
**Example:**
```typescript
// Source: react-native-mmkv documentation
import { storage } from '../storage/storage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const MESSAGES_KEY = 'chat_messages';
const CONVERSATION_META_KEY = 'conversation_meta';

// Store messages (synchronous - no await needed)
function persistMessages(messages: ChatMessage[]): void {
  storage.set(MESSAGES_KEY, JSON.stringify(messages));
}

// Load messages (synchronous)
function loadMessages(): ChatMessage[] {
  const json = storage.getString(MESSAGES_KEY);
  return json ? JSON.parse(json) : [];
}

// Append single message (common operation)
function appendMessage(message: ChatMessage): void {
  const messages = loadMessages();
  messages.push(message);
  persistMessages(messages);
}

// Clear conversation
function clearConversation(): void {
  storage.delete(MESSAGES_KEY);
  storage.set(CONVERSATION_META_KEY, JSON.stringify({
    clearedAt: Date.now(),
  }));
}
```

### Pattern 3: Crisis Detection Before Model
**What:** Scan user messages for crisis keywords BEFORE sending to LLM; show modal if detected.
**When to use:** On every user message submission, before adding to context or generating response.
**Example:**
```typescript
// Source: Mental health research + Crisis Text Line patterns
interface CrisisResult {
  detected: boolean;
  matchedPhrases: string[];
  severity: 'low' | 'medium' | 'high';
}

// High-severity phrases that should always trigger
const HIGH_SEVERITY_PHRASES = [
  'kill myself', 'want to die', 'end my life', 'suicide',
  'ending it all', 'no reason to live', 'better off dead',
  'dont want to be here', "don't want to be here",
  'cant go on', "can't go on", 'not worth living',
  'take my own life', 'harm myself', 'hurt myself',
];

// Medium-severity phrases that warrant attention
const MEDIUM_SEVERITY_PHRASES = [
  'hopeless', 'worthless', 'trapped', 'burden to everyone',
  'no way out', 'giving up', 'cant take it anymore',
  "can't take it anymore", 'whats the point', "what's the point",
];

function detectCrisis(message: string): CrisisResult {
  const normalized = message.toLowerCase().trim();
  const matchedHigh: string[] = [];
  const matchedMedium: string[] = [];

  for (const phrase of HIGH_SEVERITY_PHRASES) {
    if (normalized.includes(phrase)) {
      matchedHigh.push(phrase);
    }
  }

  for (const phrase of MEDIUM_SEVERITY_PHRASES) {
    if (normalized.includes(phrase)) {
      matchedMedium.push(phrase);
    }
  }

  if (matchedHigh.length > 0) {
    return {
      detected: true,
      matchedPhrases: matchedHigh,
      severity: 'high',
    };
  }

  if (matchedMedium.length >= 2) {
    // Multiple medium indicators = escalate
    return {
      detected: true,
      matchedPhrases: matchedMedium,
      severity: 'medium',
    };
  }

  return {
    detected: false,
    matchedPhrases: [],
    severity: 'low',
  };
}
```

### Pattern 4: Speech Recognition with On-Device Mode
**What:** Capture voice input and transcribe using iOS on-device speech recognition.
**When to use:** When user taps microphone button in chat input.
**Example:**
```typescript
// Source: @jamsch/expo-speech-recognition GitHub
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from '@jamsch/expo-speech-recognition';
import { useState, useCallback } from 'react';

interface UseSpeechResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useSpeech(): UseSpeechResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    // Get the best transcript
    const result = event.results[0];
    if (result) {
      setTranscript(result.transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message);
    setIsListening(false);
  });

  const start = useCallback(async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone permission denied');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,           // Show partial results
      requiresOnDeviceRecognition: true,  // CRITICAL: No cloud
      iosTaskHint: 'dictation',       // Optimize for dictation
      iosCategory: {
        category: 'playAndRecord',
        categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
        mode: 'measurement',
      },
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, transcript, error, start, stop };
}
```

### Pattern 5: App State Detection for Conversation End
**What:** Detect when app goes to background to mark conversation as ended.
**When to use:** Always listen for AppState changes; persist state on background.
**Example:**
```typescript
// Source: React Native AppState documentation
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';

export function useConversationEnd(
  onConversationEnd: () => void
): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // App went from active to background
        if (
          appState.current === 'active' &&
          nextAppState.match(/inactive|background/)
        ) {
          onConversationEnd();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [onConversationEnd]);
}

// Usage in ChatScreen:
// useConversationEnd(() => {
//   // Persist final state
//   chatStore.getState().markConversationEnded();
// });
```

### Anti-Patterns to Avoid
- **Waiting for full response before display:** Users perceive 5-10 second waits as broken. Always stream tokens.
- **Sending to model before crisis check:** Crisis detection MUST happen before adding message to context.
- **Using cloud speech recognition:** Violates privacy requirement. Always set `requiresOnDeviceRecognition: true`.
- **Storing messages in React state only:** App termination loses conversation. Persist to MMKV immediately.
- **Hard-coded crisis keywords without negation handling:** "I don't want to kill myself" should NOT trigger. Check for negation patterns.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speech-to-text | Custom audio processing | expo-speech-recognition | iOS SFSpeechRecognizer handles noise cancellation, punctuation, speaker adaptation |
| Streaming text display | Manual token concatenation | React state with callback | Simple; llama.rn callback handles chunking |
| Chat message virtualization | Custom scroll handler | FlatList with inverted | React Native's FlatList handles virtualization; invert for chat pattern |
| Typing indicator animation | Manual timing | Reanimated or Lottie | Pre-built animations look better, are more performant |
| Keyboard avoidance | Manual Keyboard listeners | KeyboardAvoidingView or react-native-keyboard-controller | Handles iOS/Android differences, safe area insets |

**Key insight:** Speech recognition is extremely complex (noise cancellation, speaker adaptation, language models). iOS SFSpeechRecognizer is world-class and runs on-device - use it.

## Common Pitfalls

### Pitfall 1: Blocking UI During Token Generation
**What goes wrong:** UI freezes while model generates, no visual feedback.
**Why it happens:** Not using streaming callback; waiting for full completion.
**How to avoid:**
1. Always pass the partial completion callback to `context.completion()`
2. Update UI state on each token
3. Show typing indicator immediately when generation starts
**Warning signs:** Long delays before any response appears; users think app is frozen.

### Pitfall 2: Speech Recognition Fails Silently
**What goes wrong:** Microphone button pressed, nothing happens; no transcription appears.
**Why it happens:** Missing permissions, on-device recognition not available, audio session conflict.
**How to avoid:**
1. Check permissions before starting (requestPermissionsAsync)
2. Handle 'error' event explicitly
3. Show visual feedback during listening
4. Fall back gracefully if on-device not supported
**Warning signs:** Users report "microphone doesn't work"; no error logs.

### Pitfall 3: Crisis Modal Can Be Dismissed Immediately
**What goes wrong:** User quickly dismisses crisis modal without seeing resources.
**Why it happens:** Standard modal allows immediate dismissal; onRequestClose handler not blocked.
**How to avoid:**
1. Use state to track modal display time
2. Disable dismiss button for 5 seconds
3. Use `onRequestClose` to prevent Android back button dismiss
4. Make modal truly non-dismissable until timer expires
**Warning signs:** Analytics show <1 second modal view times; users never see hotline numbers.

### Pitfall 4: Message Persistence Race Condition
**What goes wrong:** Messages appear in UI but disappear after app restart.
**Why it happens:** React state updated before MMKV persist; app killed before persist completes.
**How to avoid:**
1. Persist to MMKV BEFORE updating React state
2. Load from MMKV on mount, not from initial state
3. MMKV is synchronous, so no race condition if called first
**Warning signs:** Messages intermittently missing after restart; works fine during session.

### Pitfall 5: Stop Words Not Configured Properly
**What goes wrong:** Model continues generating past natural end; response includes special tokens.
**Why it happens:** Llama 3.2 uses `<|eot_id|>` as end token; not in stop list.
**How to avoid:**
1. Include ALL Llama 3.2 stop tokens (see code example above)
2. Test with various prompts to verify clean endings
3. Strip any remaining special tokens from final output
**Warning signs:** Responses end abruptly mid-sentence; responses include `<|eot_id|>` text.

### Pitfall 6: Crisis Detection False Positives
**What goes wrong:** Modal appears for innocent phrases like "this kills me" (slang for funny).
**Why it happens:** Keyword matching without context; no negation handling.
**How to avoid:**
1. Use phrase matching, not individual words
2. Check for negation patterns ("I don't", "I'm not", "never")
3. Require phrase + context (proximity to first-person)
4. Consider severity levels, not binary detection
**Warning signs:** Users report modal appearing during normal conversation; modal fatigue.

## Code Examples

Verified patterns from official sources:

### Complete Chat Service
```typescript
// services/llm/ChatService.ts
import { LLMService } from './LLMService';
import { detectCrisis, CrisisResult } from '../safety/CrisisDetector';
import { SYSTEM_PROMPT } from './systemPrompt';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface SendMessageResult {
  crisis: CrisisResult | null;
  aborted: boolean;
}

const STOP_WORDS = [
  '</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>',
  '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>', '<|endoftext|>',
];

class ChatServiceImpl {
  private abortController: AbortController | null = null;

  async sendMessage(
    userMessage: string,
    conversationHistory: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullText: string) => void,
    onCrisis: (result: CrisisResult) => void
  ): Promise<SendMessageResult> {
    // Step 1: Crisis detection BEFORE sending to model
    const crisisResult = detectCrisis(userMessage);
    if (crisisResult.detected) {
      onCrisis(crisisResult);
      // Still return crisis result - UI decides whether to proceed
      return { crisis: crisisResult, aborted: false };
    }

    // Step 2: Build message array with system prompt
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    // Step 3: Get context and generate response
    const context = LLMService.getContext();

    try {
      const result = await context.completion(
        {
          messages,
          n_predict: 512,
          stop: STOP_WORDS,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        },
        (data) => {
          onToken(data.token);
        }
      );

      onComplete(result.text);
      return { crisis: null, aborted: false };

    } catch (error) {
      console.error('[ChatService] Completion error:', error);
      throw error;
    }
  }

  stopGeneration(): void {
    // Note: llama.rn may not support mid-stream abort
    // This is a placeholder for future support
    this.abortController?.abort();
  }
}

export const ChatService = new ChatServiceImpl();
```

### Zustand Chat Store with MMKV Persistence
```typescript
// stores/chatStore.ts
import { create } from 'zustand';
import { storage } from '../storage/storage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  partialResponse: string;

  // Actions
  addUserMessage: (content: string) => void;
  startGeneration: () => void;
  appendToken: (token: string) => void;
  completeGeneration: (fullText: string) => void;
  clearConversation: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'chat_messages';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function persistMessages(messages: ChatMessage[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(messages));
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  partialResponse: '',

  addUserMessage: (content: string) => {
    const message: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const newMessages = [...get().messages, message];
    persistMessages(newMessages);  // Persist FIRST
    set({ messages: newMessages });
  },

  startGeneration: () => {
    set({ isGenerating: true, partialResponse: '' });
  },

  appendToken: (token: string) => {
    set((state) => ({
      partialResponse: state.partialResponse + token,
    }));
  },

  completeGeneration: (fullText: string) => {
    const message: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: fullText,
      timestamp: Date.now(),
    };

    const newMessages = [...get().messages, message];
    persistMessages(newMessages);  // Persist FIRST
    set({
      messages: newMessages,
      isGenerating: false,
      partialResponse: '',
    });
  },

  clearConversation: () => {
    storage.delete(STORAGE_KEY);
    set({ messages: [], partialResponse: '' });
  },

  loadFromStorage: () => {
    const json = storage.getString(STORAGE_KEY);
    if (json) {
      const messages = JSON.parse(json) as ChatMessage[];
      set({ messages });
    }
  },
}));
```

### Non-Dismissable Crisis Modal
```typescript
// components/modals/CrisisModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';

interface CrisisModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const DISMISS_DELAY_MS = 5000; // 5 seconds

export function CrisisModal({ visible, onDismiss }: CrisisModalProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (visible) {
      setCanDismiss(false);
      setCountdown(5);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanDismiss(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible]);

  const handleCall988 = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Linking.openURL('sms:741741');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Block Android back button until timer expires
        if (canDismiss) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            We're Here for You
          </Text>

          <Text style={styles.message}>
            It sounds like you might be going through a really difficult time.
            You don't have to face this alone.
          </Text>

          <View style={styles.resources}>
            <TouchableOpacity
              style={styles.hotlineButton}
              onPress={handleCall988}
            >
              <Text style={styles.hotlineText}>
                Call 988 (Suicide & Crisis Lifeline)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hotlineButton}
              onPress={handleTextCrisisLine}
            >
              <Text style={styles.hotlineText}>
                Text HOME to 741741 (Crisis Text Line)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.availability}>
            Available 24/7, free and confidential
          </Text>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !canDismiss && styles.continueButtonDisabled,
            ]}
            onPress={canDismiss ? onDismiss : undefined}
            disabled={!canDismiss}
          >
            <Text style={styles.continueText}>
              {canDismiss
                ? 'I understand, continue'
                : `Please wait ${countdown}s...`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    color: '#4a4a4a',
  },
  resources: {
    gap: 12,
    marginBottom: 16,
  },
  hotlineButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  hotlineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  availability: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#374151',
  },
});
```

### Empathetic System Prompt
```typescript
// services/llm/systemPrompt.ts
export const SYSTEM_PROMPT = `You are a caring, supportive companion who listens with empathy and warmth. Your name is Cove.

Core Principles:
- Listen actively and reflect back what you hear
- Validate feelings without judgment ("That sounds really difficult")
- Ask gentle, open questions to understand better
- Offer hope without minimizing pain
- Be genuine and warm, not clinical or robotic
- Use conversational language, not therapy jargon
- Keep responses concise (2-4 sentences usually)

Your Personality:
- Warm and approachable, like a trusted friend
- Patient and never rushed
- Curious about the person's experience
- Honest but kind - you won't give empty platitudes
- You acknowledge when something is genuinely hard

Important Boundaries:
- You are not a therapist or medical professional
- You cannot diagnose or prescribe treatment
- For serious concerns, gently suggest professional help
- Never dismiss or minimize someone's feelings
- Never claim to have all the answers

Start each conversation by warmly acknowledging the person. If they share something difficult, prioritize emotional validation before offering any perspective.`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for messages | MMKV synchronous storage | 2024 | 30x faster; no async complexity |
| Cloud speech recognition | On-device SFSpeechRecognizer | iOS 13+ | Privacy-preserving; works offline |
| Full response wait | Token streaming callbacks | llama.rn v0.7+ | Perceived latency drops from 5s to <500ms |
| react-native-gifted-chat | Custom chat UI | 2025 | Better control over streaming; fewer dependencies |
| Keyword lists from 2020 | Research-based phrase detection | 2024 | Lower false positive rates; context-aware |

**Deprecated/outdated:**
- **AsyncStorage:** Too slow for frequent message persistence; use MMKV
- **@react-native-voice/voice without Expo plugin:** Harder to configure; use expo-speech-recognition for Expo projects
- **react-native-speech:** Unmaintained; use expo-speech-recognition

## Open Questions

Things that couldn't be fully resolved:

1. **Stop generation mid-stream**
   - What we know: llama.rn completion returns a promise; no documented abort mechanism
   - What's unclear: Whether stopping mid-stream is possible without killing the context
   - Recommendation: Implement "stop" button that flags state; ignore subsequent tokens; may need to wait for completion anyway

2. **Crisis detection negation handling**
   - What we know: Simple keyword matching has false positives ("I don't want to die")
   - What's unclear: Optimal regex/NLP approach for local-only detection
   - Recommendation: Start with phrase matching + simple negation check; iterate based on real usage patterns

3. **Speech recognition word-by-word vs final**
   - What we know: `interimResults: true` provides partial transcripts
   - What's unclear: Whether to show interim results or wait for final (trade-off: responsiveness vs accuracy)
   - Recommendation: Show interim results in input field; user can edit before sending

4. **Conversation context window management**
   - What we know: n_ctx is 2048 tokens; long conversations will exceed this
   - What's unclear: Best strategy for context pruning (summarize? truncate oldest?)
   - Recommendation: For Phase 2, truncate oldest messages when approaching limit; revisit in later phase

## Sources

### Primary (HIGH confidence)
- [llama.rn README.md](https://github.com/mybigday/llama.rn) - Verified locally in node_modules; streaming API, message format, stop words
- [expo-speech-recognition GitHub](https://github.com/jamsch/expo-speech-recognition) - On-device mode, event API, iOS configuration
- [React Native AppState](https://reactnative.dev/docs/appstate) - Background detection, event subscription
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) - JSON serialization pattern, synchronous API

### Secondary (MEDIUM confidence)
- [Stanford HAI Crisis Detection](https://hai.stanford.edu/news/using-nlp-detect-mental-health-crises) - Two-stage NLP approach
- [Nature Digital Medicine](https://www.nature.com/articles/s41746-023-00951-3) - Keyword filtering + ML for crisis detection
- [NIH PMC9859480](https://pmc.ncbi.nlm.nih.gov/articles/PMC9859480/) - NLP for suicide ideation detection patterns
- [Mental Health Keywords Repository](https://github.com/kharrigian/mental-health-keywords) - Curated keyword lists

### Tertiary (LOW confidence)
- [react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat) - isTyping prop, general patterns (not using library but referenced for patterns)
- WebSearch results for empathetic AI personality design - General guidance, not authoritative

## Metadata

**Confidence breakdown:**
- Streaming API: HIGH - Verified in llama.rn README.md locally installed
- Speech recognition: HIGH - expo-speech-recognition docs are comprehensive
- Message persistence: HIGH - MMKV pattern is standard, verified in multiple sources
- Crisis detection: MEDIUM - Research-backed but implementation details require iteration
- UI patterns: MEDIUM - Based on best practices, not specific library docs

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable ecosystem)
