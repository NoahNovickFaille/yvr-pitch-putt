# Download Service

The download service manages the acquisition of the ~1.8GB LLM model file with progress tracking, resume support, and integrity verification.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   ModelDownloadService                       │
│  (Download management, verification, resume support)         │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Background Downloader│    │    downloadStore     │
│ (react-native-        │    │   (Zustand state)    │
│  background-downloader)│    │                      │
└──────────────────────┘    └──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Document Directory                         │
│  (Persistent storage for model file)                          │
└──────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `ModelDownloadService.ts` | Download management, verification, resume |
| `downloadStore.ts` | Zustand store for download state |

## Model State Machine

```
┌────────────────┐
│ not_downloaded │ ◀─────────────────────────────────────────┐
└───────┬────────┘                                           │
        │ startDownload()                                    │
        ▼                                                    │
┌────────────────┐                                           │
│  downloading   │ ────── cancel/fail ───────────────────────┤
└───────┬────────┘                                           │
        │ download complete                                  │
        ▼                                                    │
┌────────────────┐                                           │
│   verifying    │ ────── verification fails ────────────────┘
└───────┬────────┘
        │ verification passes
        ▼
┌─────────────────────┐
│ ready_to_initialize │
└───────┬─────────────┘
        │ LLMService.initialize()
        ▼
┌────────────────┐
│     ready      │
└────────────────┘
```

## ModelDownloadService

Manages the complete download lifecycle.

### Key Methods

```typescript
import {
  getModelPath,
  isModelDownloaded,
  verifyModelChecksum,
  downloadModel,
  reattachToDownload,
  deleteModelFile
} from './ModelDownloadService';
```

### Check Model Status

```typescript
// Get path where model should be stored
const modelPath = getModelPath();
// → /var/mobile/.../Documents/model.gguf

// Check if model is downloaded (file exists + size check)
const downloaded = await isModelDownloaded();
// → true/false
```

### Download Model

```typescript
const { task, controls } = downloadModel({
  onBegin: (expectedBytes) => {
    console.log('Download starting:', expectedBytes, 'bytes');
  },
  onProgress: (percent, bytesWritten, totalBytes) => {
    console.log(`Progress: ${percent}%`);
    // Update UI progress bar
  },
  onDone: () => {
    console.log('Download complete');
    // Proceed to verification
  },
  onError: (error) => {
    console.error('Download failed:', error);
    // Show error UI
  }
});

// Download controls
controls.pause();   // Pause download
controls.resume();  // Resume download
controls.cancel();  // Cancel and delete partial file
```

### Resume After App Restart

```typescript
// Called on app startup
const existingTask = await reattachToDownload({
  onProgress: (percent, bytesWritten, totalBytes) => {
    // Update UI
  },
  onDone: () => {
    // Download complete
  },
  onError: (error) => {
    // Handle error
  }
});

if (existingTask) {
  console.log('Reattached to existing download');
}
```

### Verify Model Integrity

```typescript
// One-time MD5 verification (expensive for 1.8GB file)
const isValid = await verifyModelChecksum();

if (!isValid) {
  await deleteModelFile();
  // Prompt re-download
}
```

### Delete Model

```typescript
// Remove corrupted or unwanted model
await deleteModelFile();
```

## Download Store

Zustand store for reactive UI state.

### State

```typescript
interface DownloadStoreState {
  modelState: ModelState;
  setModelState: (state: ModelState) => void;
  isDownloading: () => boolean;
  canInitialize: () => boolean;
}

type ModelState =
  | 'not_downloaded'
  | 'downloading'
  | 'verifying'
  | 'ready_to_initialize'
  | 'ready';
```

### Usage

```typescript
import { useDownloadStore } from './downloadStore';

// In React component
const { modelState, setModelState } = useDownloadStore();

// Check state
if (modelState === 'not_downloaded') {
  // Show download button
}

if (useDownloadStore.getState().isDownloading()) {
  // Show progress UI
}

if (useDownloadStore.getState().canInitialize()) {
  // Enable "Start Chat" button
}
```

## Download Progress Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     App Startup                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌──────────────────────┐       ┌──────────────────────┐
│ isModelDownloaded()  │       │ reattachToDownload() │
│ returns true         │       │ finds existing task  │
└──────────┬───────────┘       └──────────┬───────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐       ┌──────────────────────┐
│ setModelState(       │       │ Continue download    │
│ 'ready_to_initialize')│       │ with progress UI     │
└──────────────────────┘       └──────────────────────┘
```

## Progress Persistence

Download progress is persisted to MMKV:
- Every ~5% progress update
- On pause/resume events
- Before app backgrounding

This allows resume after:
- App termination
- Device restart
- Network interruption

## File Size Validation

To detect incomplete downloads:

```typescript
const EXPECTED_MODEL_SIZE = 1_800_000_000; // ~1.8GB

async function isModelDownloaded(): Promise<boolean> {
  const path = getModelPath();

  if (!await FileSystem.exists(path)) {
    return false;
  }

  const info = await FileSystem.getInfoAsync(path);

  // Consider downloaded if >= 99% of expected size
  return info.size >= EXPECTED_MODEL_SIZE * 0.99;
}
```

The 99% threshold accounts for minor size variations in different model versions.

## Background Download

Uses `@kesha-antonov/react-native-background-downloader`:

- Continues download when app is backgrounded
- Survives app termination (within iOS limits)
- Automatic retry on network errors
- Progress callbacks on resume

### iOS Background Limits

- iOS may terminate downloads after ~30 seconds in background
- Download resumes when app returns to foreground
- Large files may require multiple foreground sessions

## Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| `ERR_NETWORK` | No internet | Show retry button |
| `ERR_STORAGE` | Insufficient space | Show space needed |
| `ERR_CHECKSUM` | Corrupted download | Delete and re-download |
| `ERR_TIMEOUT` | Slow connection | Auto-retry with backoff |

## Checksum Verification

One-time MD5 verification after download:

```typescript
const EXPECTED_MD5 = 'abc123...'; // Model-specific

async function verifyModelChecksum(): Promise<boolean> {
  const path = getModelPath();
  const actualMd5 = await calculateMd5(path);
  return actualMd5 === EXPECTED_MD5;
}
```

**Note**: MD5 calculation on a 1.8GB file takes several seconds. Only run once after download completes.

## Integration with LLM Service

```typescript
// App initialization flow
async function initializeApp() {
  // 1. Check if model exists
  if (await isModelDownloaded()) {
    setModelState('ready_to_initialize');

    // 2. Initialize LLM
    await LLMService.getInstance().initialize(getModelPath());
    setModelState('ready');
  } else {
    // 3. Check for existing download
    const existing = await reattachToDownload(callbacks);

    if (!existing) {
      // 4. Show download prompt
      setModelState('not_downloaded');
    }
  }
}
```

## UI States

| State | UI |
|-------|-----|
| `not_downloaded` | Download button + size info |
| `downloading` | Progress bar + pause/cancel buttons |
| `verifying` | Spinner + "Verifying..." text |
| `ready_to_initialize` | "Start" button |
| `ready` | Chat interface |

## Storage Location

Model stored in app's Documents directory:
- Survives app updates
- User can see in Files app (if enabled)
- Not backed up to iCloud (use `.nosync` or exclude)

```typescript
const MODEL_FILENAME = 'model.gguf';

function getModelPath(): string {
  return `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
}
```

## Debugging

Enable verbose logging:

```typescript
if (__DEV__) {
  console.log('[Download] Starting download');
  console.log('[Download] Progress:', percent, '%');
  console.log('[Download] Complete, verifying...');
}
```
