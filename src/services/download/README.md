# Download Service

The download service manages the acquisition of LLM model files (~1.7-2GB depending on model) with progress tracking, resume support, and integrity verification. Supports multiple model downloads for user model selection.

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
// downloadModel returns DownloadControls directly
const controls = downloadModel(
  // onProgress: (bytesWritten, totalBytes) - calculate percent yourself
  (bytesWritten, totalBytes) => {
    const percent = Math.round((bytesWritten / totalBytes) * 100);
    console.log(`Progress: ${percent}%`);
    // Update UI progress bar
  },
  // onComplete
  () => {
    console.log('Download complete');
    // Proceed to verification
  },
  // onError
  (error) => {
    console.error('Download failed:', error);
    // Show error UI
  },
  // model (optional - uses selected model from modelStore if not provided)
  selectedModel,
  // options (optional - for custom taskId/storageKey)
  { taskId: 'my-download', storageKey: 'my-download-state' }
);

// Download controls
controls.pause();   // Pause download
controls.resume();  // Resume download
controls.cancel();  // Cancel and delete partial file
```

### Resume After App Restart

```typescript
// Called on app startup - first check for existing downloads
const existingTasks = await checkForExistingDownloads(taskId);

if (existingTasks && existingTasks.length > 0) {
  // Reattach to the existing task
  const controls = reattachToDownload(
    existingTasks[0],  // The DownloadTask to reattach to
    (bytesWritten, totalBytes) => {
      const percent = Math.round((bytesWritten / totalBytes) * 100);
      // Update UI
    },
    () => {
      // Download complete
    },
    (error) => {
      // Handle error
    },
    selectedModel,  // optional
    { taskId, storageKey }  // optional
  );
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
  | 'download_paused'
  | 'verifying'
  | 'ready_to_initialize'
  | 'initializing'
  | 'ready'
  | 'unloaded'
  | 'error';
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

To detect incomplete downloads, each model has an expected size defined in `src/constants/model.ts`:

```typescript
// Model sizes (Q4_K_M quantization)
// Llama 3.2 3B:    ~2.0GB
// Gemma 2 2B:      ~1.7GB
// Dolphin 3.0 3B:  ~2.0GB

async function isModelDownloaded(model: ModelDefinition): Promise<boolean> {
  const path = getModelPath(model);

  if (!await FileSystem.exists(path)) {
    return false;
  }

  const info = await FileSystem.getInfoAsync(path);

  // Consider downloaded if >= 99% of expected size
  return info.size >= model.sizeBytes * 0.99;
}
```

The 99% threshold accounts for minor size variations.

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

One-time verification after download (per-model):

```typescript
async function verifyModelChecksum(model: ModelDefinition): Promise<boolean> {
  const path = getModelPath(model);
  // Verifies file exists and size matches expected
  // Full SHA256 verification skipped for performance (1.7-2GB files)
  return await validateFileIntegrity(path, model.sizeBytes);
}
```

**Note**: Full hash verification on large files is expensive. We rely on size validation + successful llama.rn initialization as integrity checks.

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
| `download_paused` | Resume button + progress info |
| `verifying` | Spinner + "Verifying..." text |
| `ready_to_initialize` | "Start" button |
| `initializing` | Spinner + "Loading model..." text |
| `ready` | Chat interface |
| `unloaded` | "Reload" button (after memory pressure) |
| `error` | Error message + retry button |

## Storage Location

Models stored in app's Documents directory:
- Survives app updates
- User can see in Files app (if enabled)
- Not backed up to iCloud (use `.nosync` or exclude)
- Each model uses its own filename (e.g., `Llama-3.2-3B-Instruct-Q4_K_M.gguf`)

```typescript
// Filename defined per-model in src/constants/model.ts
function getModelPath(model: ModelDefinition): string {
  return `${FileSystem.documentDirectory}${model.filename}`;
}
```

## Multi-Model Support

Users can download multiple models and switch between them:
- Each model has a unique ID, filename, and download URL
- Download state tracked per-model via `getDownloadStateKey(modelId)`
- Selected model stored in `modelStore` (Zustand + MMKV)
- Switching models requires app restart to reinitialize LLMService

## Debugging

Enable verbose logging:

```typescript
if (__DEV__) {
  console.log('[Download] Starting download');
  console.log('[Download] Progress:', percent, '%');
  console.log('[Download] Complete, verifying...');
}
```
