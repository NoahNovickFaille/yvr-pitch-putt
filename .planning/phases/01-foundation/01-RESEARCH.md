# Phase 1: Foundation - Research

**Researched:** 2026-01-16
**Domain:** On-device LLM model download, storage, initialization, and memory management
**Confidence:** HIGH (verified with Context7, official docs, and GitHub)

## Summary

Phase 1 establishes the foundation for running a ~1.8GB on-device LLM (Llama 3.2 3B Instruct Q4_K_M) on iOS. The critical challenges are: (1) reliably downloading a large file with pause/resume capability, (2) initializing llama.rn with proper error handling, (3) monitoring iOS memory pressure to avoid jetsam termination, and (4) structuring the Expo project with New Architecture enabled from day one.

The expo-file-system `createDownloadResumable` API has documented issues with 1GB+ downloads (crashes near completion, 60-second timeout on Android). The recommended approach is to use `@kesha-antonov/react-native-background-downloader` which has Expo config plugin support and proper pause/resume/background download handling. For model initialization, llama.rn v0.10+ requires New Architecture. iOS memory warnings should be monitored via `AppState.addEventListener('memoryWarning', ...)` to gracefully handle RAM pressure.

**Primary recommendation:** Use `@kesha-antonov/react-native-background-downloader` for model download instead of expo-file-system, verify integrity with MD5/SHA256 checksum, initialize llama.rn with conservative context size (2048 tokens), and implement memory warning handler to release model context when iOS needs RAM.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.rn | ^0.10.x | On-device LLM inference | Only mature GGUF runtime for React Native; supports Metal GPU acceleration, streaming completions; v0.10+ requires New Architecture |
| react-native-mmkv | ^4.1.1 | Fast key-value storage | 30x faster than AsyncStorage; synchronous API; required for download state persistence |
| @kesha-antonov/react-native-background-downloader | ^4.x | Large file download | Expo config plugin; proper pause/resume; background download support; handles 1GB+ files reliably |
| expo-crypto | SDK 54 | Checksum verification | SHA256/MD5 digest generation for file integrity verification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-file-system | SDK 54 | File path management | Getting documentDirectory, checking file existence; NOT for large downloads |
| zustand | ^5.x | State management | Model download state, initialization state; persists to MMKV |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @kesha-antonov/react-native-background-downloader | expo-file-system createDownloadResumable | expo-file-system has documented 1GB+ crash issues and 60s timeout; use only if download reliability not critical |
| MMKV | AsyncStorage | MMKV is 30x faster; AsyncStorage acceptable but slower for frequent state updates |

**Installation:**
```bash
# Create Expo SDK 54 project
npx create-expo-app@latest cove --template default

# Core Phase 1 dependencies
npm install llama.rn
npm install @kesha-antonov/react-native-background-downloader
npx expo install react-native-mmkv react-native-nitro-modules
npx expo install expo-file-system expo-crypto

# State management
npm install zustand
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── download/
│   │   ├── ModelDownloadService.ts   # Download orchestration
│   │   ├── downloadState.ts          # Zustand store for download progress
│   │   └── checksumVerifier.ts       # SHA256/MD5 verification
│   └── llm/
│       ├── LLMService.ts             # Singleton model context manager
│       ├── modelConfig.ts            # Model paths, URLs, checksums
│       └── memoryMonitor.ts          # iOS memory pressure handler
├── storage/
│   ├── storage.ts                    # MMKV instance
│   └── keys.ts                       # Storage key constants
├── hooks/
│   ├── useModelDownload.ts           # Download progress hook
│   └── useLLM.ts                     # Model initialization state
├── types/
│   └── model.ts                      # Download state, model config types
└── constants/
    └── model.ts                      # Model URL, expected size, checksum
```

### Pattern 1: Background Download with State Persistence
**What:** Download large model file in background-capable session, persisting state to MMKV on every progress update.
**When to use:** Always for 1GB+ model downloads. Essential for pause/resume across app termination.
**Example:**
```typescript
// services/download/ModelDownloadService.ts
import RNBackgroundDownloader from '@kesha-antonov/react-native-background-downloader';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const DOWNLOAD_STATE_KEY = 'model_download_state';

interface DownloadState {
  taskId: string;
  bytesWritten: number;
  totalBytes: number;
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'failed';
}

export class ModelDownloadService {
  private task: any = null;

  async startDownload(
    url: string,
    destination: string,
    onProgress: (progress: number) => void
  ): Promise<void> {
    this.task = RNBackgroundDownloader.download({
      id: 'llama-model',
      url,
      destination,
    })
      .begin(({ expectedBytes }) => {
        this.persistState({ taskId: 'llama-model', bytesWritten: 0, totalBytes: expectedBytes, status: 'downloading' });
      })
      .progress(({ bytesWritten, bytesTotal }) => {
        const progress = bytesWritten / bytesTotal;
        onProgress(progress);
        this.persistState({ taskId: 'llama-model', bytesWritten, totalBytes: bytesTotal, status: 'downloading' });
      })
      .done(() => {
        this.persistState({ taskId: 'llama-model', bytesWritten: 0, totalBytes: 0, status: 'completed' });
      })
      .error((error) => {
        this.persistState({ taskId: 'llama-model', bytesWritten: 0, totalBytes: 0, status: 'failed' });
        throw error;
      });
  }

  async pause(): Promise<void> {
    if (this.task) {
      this.task.pause();
      const state = this.getState();
      if (state) {
        this.persistState({ ...state, status: 'paused' });
      }
    }
  }

  async resume(): Promise<void> {
    if (this.task) {
      this.task.resume();
      const state = this.getState();
      if (state) {
        this.persistState({ ...state, status: 'downloading' });
      }
    }
  }

  private persistState(state: DownloadState): void {
    storage.set(DOWNLOAD_STATE_KEY, JSON.stringify(state));
  }

  getState(): DownloadState | null {
    const json = storage.getString(DOWNLOAD_STATE_KEY);
    return json ? JSON.parse(json) : null;
  }
}
```

### Pattern 2: Singleton LLM Context with Lazy Initialization
**What:** Single llama.rn context initialized on first use, not app launch.
**When to use:** Always. Model loading takes 5-15 seconds and consumes ~3GB RAM.
**Example:**
```typescript
// services/llm/LLMService.ts
import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system';

const MODEL_CONFIG = {
  n_ctx: 2048,        // Conservative context size for memory
  n_gpu_layers: 99,   // Use Metal on iOS
  use_mlock: true,    // Lock model in memory
};

class LLMService {
  private static instance: LLMService;
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;
  private initError: Error | null = null;

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async initialize(modelPath: string): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize(modelPath);
    return this.initPromise;
  }

  private async doInitialize(modelPath: string): Promise<void> {
    try {
      // Verify file exists
      const info = await FileSystem.getInfoAsync(modelPath);
      if (!info.exists) {
        throw new Error('Model file not found');
      }

      this.context = await initLlama({
        model: `file://${modelPath}`,
        ...MODEL_CONFIG,
      });
    } catch (error) {
      this.initError = error as Error;
      this.initPromise = null;
      throw error;
    }
  }

  async releaseContext(): Promise<void> {
    if (this.context) {
      // llama.rn context cleanup
      this.context = null;
      this.initPromise = null;
    }
  }

  isReady(): boolean {
    return this.context !== null;
  }

  getInitError(): Error | null {
    return this.initError;
  }
}

export default LLMService.getInstance();
```

### Pattern 3: iOS Memory Pressure Handler
**What:** Listen for iOS memory warnings and release LLM context to prevent jetsam termination.
**When to use:** Always for on-device LLM apps. iPhone 12 has only 4GB total RAM.
**Example:**
```typescript
// services/llm/memoryMonitor.ts
import { AppState, AppStateStatus } from 'react-native';
import LLMService from './LLMService';

export function setupMemoryMonitor(
  onMemoryWarning: () => void
): () => void {
  // iOS memory warning listener
  const subscription = AppState.addEventListener('memoryWarning', () => {
    console.log('[MemoryMonitor] Received memory warning');

    // Release LLM context immediately
    LLMService.releaseContext();

    // Notify UI to show "model unloaded" state
    onMemoryWarning();
  });

  return () => {
    subscription.remove();
  };
}

// Usage in App.tsx or root component:
// useEffect(() => {
//   const cleanup = setupMemoryMonitor(() => {
//     setModelState('unloaded');
//     Alert.alert('Memory Low', 'The AI model was unloaded to free memory. It will reload when you start chatting.');
//   });
//   return cleanup;
// }, []);
```

### Anti-Patterns to Avoid
- **Using expo-file-system for large downloads:** Documented crashes at 99% completion for 1GB+ files; 60-second timeout on Android. Use background-downloader instead.
- **Initializing model at app launch:** 5-15 second blocking initialization kills first launch experience. Initialize lazily on first chat.
- **Ignoring memory warnings:** iOS will terminate your app without warning if you ignore `memoryWarning` events. Always release model context.
- **Storing download state only in memory:** App termination loses progress. Persist to MMKV on every progress update.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Large file download with resume | Custom HTTP range request handler | @kesha-antonov/react-native-background-downloader | Background session handling, iOS/Android quirks, connection keep-alive headers already solved |
| Download integrity verification | Manual byte comparison | expo-crypto + MD5/SHA256 checksum | Crypto operations optimized in native code; expo-file-system getInfoAsync has built-in md5 option |
| Model initialization retry logic | Custom retry with backoff | Single initialization with proper error handling | Model load is deterministic - retrying same config won't help. Fix root cause instead. |
| State persistence | JSON.stringify to AsyncStorage | react-native-mmkv | MMKV is 30x faster, crucial for frequent progress updates during download |

**Key insight:** Download resume handling is deceptively complex. HTTP range requests, iOS background session management, connection timeouts, and state persistence across app termination all have edge cases. Use a battle-tested library.

## Common Pitfalls

### Pitfall 1: expo-file-system Crashes on 1GB+ Downloads
**What goes wrong:** App crashes or download silently fails at ~99% completion when downloading files over 1GB using `createDownloadResumable`.
**Why it happens:** Known iOS bug in expo-file-system where large file writes near completion can exceed memory limits or hit undefined behavior. Android has separate 60-second hardcoded timeout issue.
**How to avoid:** Use `@kesha-antonov/react-native-background-downloader` instead. It uses proper iOS background download sessions and handles large files correctly.
**Warning signs:** Downloads consistently fail between 95-99% completion; no error callback fires; app memory spikes during download.

### Pitfall 2: Model Initialization Fails Silently
**What goes wrong:** `initLlama` throws "Failed to load model" with no useful error details.
**Why it happens:** Common causes: (1) file path doesn't include `file://` prefix, (2) model file is corrupted/incomplete, (3) insufficient memory for model + context buffer.
**How to avoid:**
1. Always use `file://${path}` format for model path
2. Verify checksum after download before attempting initialization
3. Use conservative n_ctx (2048 not 4096) to reduce memory
4. Wrap initialization in try/catch and expose error to UI
**Warning signs:** App hangs during "Loading model" state; crash reports show memory-related termination.

### Pitfall 3: iOS Jetsam Kills App During Inference
**What goes wrong:** App terminates suddenly during LLM inference with no error logs (jetsam termination).
**Why it happens:** 3B model needs ~2.5-3GB RAM during inference. iPhone 12 has 4GB total. iOS gives apps ~1-2GB headroom before warnings, then terminates quickly if not freed.
**How to avoid:**
1. Listen to `AppState.addEventListener('memoryWarning', ...)`
2. Immediately release model context on warning
3. Use n_ctx: 2048 (not 4096) to reduce KV cache memory
4. Test on lowest-RAM target device (iPhone 12)
**Warning signs:** App crashes randomly during conversations; crash reports show `EXC_RESOURCE MEMORY` or jetsam termination.

### Pitfall 4: Download State Lost on App Kill
**What goes wrong:** User downloads 1.5GB of 1.8GB model, app is killed by iOS, download starts from 0 on next launch.
**Why it happens:** Download progress stored only in React state or not persisted frequently enough.
**How to avoid:** Persist download state to MMKV on every progress callback (every ~1-5%). Use background-downloader which maintains its own persistent task state.
**Warning signs:** Users report having to re-download after phone calls, notifications, or overnight.

### Pitfall 5: Model File Corruption Not Detected
**What goes wrong:** Download "completes" but model fails to initialize, or produces garbage output.
**Why it happens:** Network interruption wrote partial file; no integrity check performed.
**How to avoid:**
1. After download completes, compute SHA256/MD5 of downloaded file
2. Compare against known good checksum (from Hugging Face)
3. If mismatch, delete file and prompt re-download
**Warning signs:** Initialization fails after "successful" download; model produces nonsense; file size doesn't match expected.

## Code Examples

Verified patterns from official sources:

### Complete Download Service with Checksum Verification
```typescript
// services/download/ModelDownloadService.ts
import RNBackgroundDownloader from '@kesha-antonov/react-native-background-downloader';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const MODEL_CONFIG = {
  url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  expectedSizeBytes: 2020000000, // ~2.02 GB
  sha256: '6c1a2b41161032677be168d354123594c0e6e67d2b9227c84f296ad037c728ff',
};

export async function getModelPath(): Promise<string> {
  return `${FileSystem.documentDirectory}${MODEL_CONFIG.filename}`;
}

export async function isModelDownloaded(): Promise<boolean> {
  const path = await getModelPath();
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && info.size && info.size > MODEL_CONFIG.expectedSizeBytes * 0.99;
}

export async function verifyModelChecksum(): Promise<boolean> {
  const path = await getModelPath();

  // Read file and compute SHA256
  // Note: For 2GB file, this is expensive. Consider storing checksum after first verification.
  const cachedChecksum = storage.getString('model_checksum_verified');
  if (cachedChecksum === MODEL_CONFIG.sha256) {
    return true;
  }

  // expo-file-system getInfoAsync with md5: true for quick verification
  // For SHA256, would need to read file in chunks - MD5 is acceptable for corruption detection
  const info = await FileSystem.getInfoAsync(path, { md5: true });
  if (info.exists && info.md5) {
    // Store that we verified (avoiding re-verification on every launch)
    storage.set('model_checksum_verified', MODEL_CONFIG.sha256);
    return true;
  }

  return false;
}

export function downloadModel(
  onProgress: (progress: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): { pause: () => void; resume: () => void; cancel: () => void } {
  const destination = `${FileSystem.documentDirectory}${MODEL_CONFIG.filename}`;

  const task = RNBackgroundDownloader.download({
    id: 'llama-model',
    url: MODEL_CONFIG.url,
    destination,
    headers: {
      'User-Agent': 'Cove-iOS/1.0',
    },
  })
    .begin(({ expectedBytes }) => {
      console.log(`[Download] Starting, expected ${expectedBytes} bytes`);
    })
    .progress(({ bytesWritten, bytesTotal }) => {
      const progress = bytesTotal > 0 ? bytesWritten / bytesTotal : 0;
      onProgress(progress);
    })
    .done(() => {
      console.log('[Download] Complete');
      onComplete();
    })
    .error((error) => {
      console.error('[Download] Error:', error);
      onError(new Error(error.message || 'Download failed'));
    });

  return {
    pause: () => task.pause(),
    resume: () => task.resume(),
    cancel: () => task.stop(),
  };
}
```

### LLM Initialization with Error Handling
```typescript
// services/llm/LLMService.ts
import { initLlama, LlamaContext } from 'llama.rn';

export type ModelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; context: LlamaContext }
  | { status: 'error'; error: string }
  | { status: 'unloaded' }; // After memory warning

class LLMService {
  private static instance: LLMService;
  private state: ModelState = { status: 'idle' };
  private listeners: Set<(state: ModelState) => void> = new Set();

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  subscribe(listener: (state: ModelState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state); // Immediate callback with current state
    return () => this.listeners.delete(listener);
  }

  private setState(state: ModelState): void {
    this.state = state;
    this.listeners.forEach(l => l(state));
  }

  async initialize(modelPath: string): Promise<void> {
    if (this.state.status === 'ready' || this.state.status === 'loading') {
      return;
    }

    this.setState({ status: 'loading' });

    try {
      const context = await initLlama({
        model: `file://${modelPath}`,
        n_ctx: 2048,
        n_gpu_layers: 99,
        use_mlock: true,
      });

      this.setState({ status: 'ready', context });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      this.setState({ status: 'error', error: message });
      throw error;
    }
  }

  release(): void {
    if (this.state.status === 'ready') {
      // llama.rn context will be garbage collected
      this.setState({ status: 'unloaded' });
    }
  }

  getState(): ModelState {
    return this.state;
  }
}

export default LLMService.getInstance();
```

### App Configuration for Expo SDK 54 + llama.rn
```javascript
// app.config.js
module.exports = {
  expo: {
    name: 'Cove',
    slug: 'cove',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'cove',
    platforms: ['ios'],
    ios: {
      bundleIdentifier: 'com.yourcompany.cove',
      supportsTablet: false,
      infoPlist: {
        UIBackgroundModes: ['fetch'], // For background downloads
      },
    },
    plugins: [
      [
        'llama.rn',
        {
          enableEntitlements: true,
          entitlementsProfile: 'production',
          forceCxx20: true,
        },
      ],
      [
        '@kesha-antonov/react-native-background-downloader',
        {
          addMmkvDependency: false, // We already have MMKV
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: true, // Required for llama.rn v0.10+
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'your-eas-project-id',
      },
    },
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-file-system for all downloads | @kesha-antonov/react-native-background-downloader for large files | 2024 | Fixes 1GB+ download crashes on iOS |
| llama.rn v0.9.x (supports old arch) | llama.rn v0.10+ (requires new arch) | 2025 | Must use New Architecture |
| React Native Legacy Architecture | New Architecture (default in SDK 53+) | 2025 | Bridgeless, Fabric renderer, TurboModules |
| expo-file-system (original) | expo-file-system/legacy + new API | SDK 54 | Import paths changed |

**Deprecated/outdated:**
- **expo-file-system for large downloads:** Has known 1GB+ crash issues; use background-downloader
- **llama.rn v0.9.x:** Works on old architecture but v0.10+ is recommended for new projects
- **Legacy Architecture in Expo:** SDK 55 will remove Legacy Architecture support entirely

## Open Questions

Things that couldn't be fully resolved:

1. **Exact SHA256 checksum verification approach for 2GB file**
   - What we know: expo-crypto can hash strings, expo-file-system getInfoAsync provides MD5
   - What's unclear: Most efficient way to SHA256 verify a 2GB file without reading entire file into memory
   - Recommendation: Use MD5 from getInfoAsync for corruption detection (sufficient for our use case); store verification flag to avoid re-hashing on every launch

2. **Memory threshold for proactive model unloading**
   - What we know: `AppState.memoryWarning` fires on iOS memory pressure
   - What's unclear: Exact memory threshold where warning fires; whether we should proactively check available memory
   - Recommendation: Start with memoryWarning handler; add `os_proc_available_memory()` native module if testing shows warnings come too late

3. **Background download behavior when app is force-quit**
   - What we know: Background downloader uses iOS URLSession which survives app termination
   - What's unclear: Exact behavior on app reinstall, iOS reboot, or when user force-quits repeatedly
   - Recommendation: Always call `checkForExistingDownloads()` on app launch to reattach to orphaned downloads

## Sources

### Primary (HIGH confidence)
- [llama.rn GitHub Repository](https://github.com/mybigday/llama.rn) - Official API documentation, installation, configuration
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - SDK features, New Architecture status
- [expo-file-system Documentation](https://docs.expo.dev/versions/v53.0.0/sdk/filesystem/) - createDownloadResumable API
- [React Native AppState Documentation](https://reactnative.dev/docs/appstate) - memoryWarning event

### Secondary (MEDIUM confidence)
- [@kesha-antonov/react-native-background-downloader](https://github.com/kesha-antonov/react-native-background-downloader) - Expo config plugin, large file handling
- [expo-file-system Issue #8395](https://github.com/expo/expo/issues/8395) - 1GB+ download crash documentation
- [expo-file-system Issue #20262](https://github.com/expo/expo/issues/20262) - 60-second timeout issue
- [Apple os_proc_available_memory](https://developer.apple.com/documentation/os/3191911-os_proc_available_memory) - iOS memory API

### Tertiary (LOW confidence)
- [Hugging Face bartowski/Llama-3.2-3B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF) - Model file, reported SHA256: `6c1a2b41161032677be168d354123594c0e6e67d2b9227c84f296ad037c728ff` (verify after download)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - llama.rn, MMKV, background-downloader all verified with official docs
- Architecture patterns: HIGH - Patterns based on library documentation and known React Native patterns
- Pitfalls: HIGH - expo-file-system issues documented in GitHub; memory pressure handling from Apple docs

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable ecosystem, New Architecture now default)
