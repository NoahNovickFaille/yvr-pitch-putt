# Stack Research

**Domain:** Local-first emotional companion / AI journaling iOS app
**Researched:** 2026-01-16
**Confidence:** HIGH (locked choices validated, gaps filled with current ecosystem standards)

## Recommended Stack

### Core Technologies (Locked - Validated)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Native (Expo) | SDK 54 (RN 0.81) | Cross-platform framework | Latest stable SDK. New Architecture enabled by default. Precompiled RN for iOS reduces build times from ~120s to ~10s. React 19.1 included. |
| llama.rn | ^0.9.1 | On-device LLM inference | Only mature GGUF runtime for React Native. Supports Metal (iOS), streaming completions, tool calling. v0.9.x works with both old/new architecture. v0.10+ requires New Architecture. |
| react-native-mmkv | ^4.1.1 | Fast key-value storage | ~30x faster than AsyncStorage. Synchronous API (no Promises needed). V4 is a Nitro Module with React hooks. Perfect for JSON document storage. |
| Uniwind | ^1.0.0 | Tailwind CSS styling | Build-time optimized (2.5x faster than NativeWind). Tailwind 4 support. Platform selectors (`ios:`, `android:`). From creators of Unistyles. |
| @react-native-voice/voice | ^3.2.4 | Speech-to-text | Uses iOS on-device speech recognition (privacy-preserving). Expo config plugin available. Simple API with async/await. |
| React Navigation | ^7.x | Navigation | Static configuration API simplifies TypeScript and deep linking. Bundled with Expo SDK 54. Expo Router is alternative but adds file-system conventions. |

### Supporting Libraries (Gaps Filled)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-file-system | SDK 54 bundled | File operations & download | Model download with progress. Use `createDownloadResumable` for ~1.8GB model file with pause/resume capability. |
| react-native-reanimated | ^4.2.1 | Animations | Smooth UI animations. Required for shared element transitions. V4 requires New Architecture. Use V3 if targeting old arch. |
| lucide-react-native | ^0.562.0 | Icons | 1,500+ clean, consistent icons. Feather Icons fork. Lighter than @expo/vector-icons. Pairs well with Tailwind aesthetic. |
| expo-haptics | SDK 54 bundled | Haptic feedback | Tactile responses for send button, crisis detection. Simple API: `impactAsync`, `selectionAsync`, `notificationAsync`. |
| zustand | ^5.x | State management | Lightweight (~2KB). Hook-based, no providers. Fine-grained re-renders. Works with Hermes. Use for app state (model status, chat state). |
| react-native-safe-area-context | SDK 54 bundled | Safe area handling | Handles notches, home indicators. Required by Expo Router. Built-in `SafeAreaView` is deprecated. |
| react-native-nitro-modules | ^0.21.x | Native module bridge | Dependency of react-native-mmkv V4. Installed automatically. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| jest-expo | Unit testing | Preset that mocks Expo SDK. Use `jest-expo/universal` for cross-platform tests. |
| @testing-library/react-native | Component testing | Intuitive query API for UI tests. Cleaner than Enzyme. |
| Maestro | E2E testing | YAML-based UI tests. Works with Expo builds. No complex setup. CI/CD friendly. |
| TypeScript | Type safety | First-class support in Expo SDK 54. Required for React Navigation v7 static API benefits. |
| expo-dev-client | Development builds | Required for native modules like llama.rn. Can't use Expo Go for this project. |

## Installation

```bash
# Create Expo project with SDK 54
npx create-expo-app@latest confidant --template default

# Core dependencies (locked choices)
npx expo install react-native-mmkv react-native-nitro-modules
npm install llama.rn
npm install uniwind
npm install @react-native-voice/voice
npm install @react-navigation/native @react-navigation/native-stack

# Supporting dependencies (gaps filled)
npx expo install expo-file-system expo-haptics
npx expo install react-native-reanimated react-native-safe-area-context
npm install lucide-react-native react-native-svg
npm install zustand

# Dev dependencies
npx expo install jest-expo
npm install -D @testing-library/react-native @types/react jest
```

## Configuration Required

### app.json / app.config.js
```json
{
  "expo": {
    "plugins": [
      "@react-native-voice/voice",
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          },
          "android": {
            "newArchEnabled": true
          }
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Confidant uses your microphone for voice-to-text input",
        "NSSpeechRecognitionUsageDescription": "Confidant uses speech recognition to transcribe your voice messages"
      }
    }
  }
}
```

### babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

### global.css (Uniwind / Tailwind 4)
```css
@import "tailwindcss";

@theme {
  --color-primary: #6366f1;
  --color-background: #fafafa;
  --color-card: #ffffff;
  --color-foreground: #18181b;
  --color-muted: #71717a;
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| llama.rn (GGUF) | react-native-executorch (PTE) | Future consideration if need Apple Neural Engine optimization. ExecuTorch has nicer `useLLM()` hook API but less flexible model ecosystem. |
| MMKV | expo-sqlite | If you need relational queries, full-text search, or complex data relationships. Overkill for JSON documents. |
| Uniwind | NativeWind | If team is already using NativeWind. Uniwind is faster but newer. |
| React Navigation | Expo Router | If building a web-first universal app. Expo Router adds file-based routing conventions. |
| Lucide | @expo/vector-icons | If you need icon families beyond Lucide (FontAwesome, Material, etc.). Vector-icons is larger bundle. |
| zustand | Redux Toolkit | If team already uses Redux. Zustand is simpler for new projects. |
| Maestro | Detox | If need finer-grained control over test assertions. Detox is more complex to set up. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| AsyncStorage | 30x slower than MMKV. Async API adds complexity. | react-native-mmkv |
| Built-in SafeAreaView | Deprecated. iOS-only. No edge-to-edge Android support. | react-native-safe-area-context |
| react-native-fs | Not compatible with Expo managed workflow. | expo-file-system |
| rn-fetch-blob | Deprecated. Not Expo compatible. | expo-file-system with createDownloadResumable |
| Expo Go | Cannot load native modules like llama.rn. | expo-dev-client (development builds) |
| Reanimated 3 | Missing Shared Element Transitions for New Arch. Less performant. | Reanimated 4 (for New Architecture projects) |
| NativeWind (older versions) | Slower runtime. Uniwind is 2.5x faster. | Uniwind |
| Context API (for global state) | Causes unnecessary re-renders. No persistence middleware. | zustand |

## Stack Patterns by Variant

**If targeting older devices (iPhone X/11):**
- Consider llama.rn v0.9.x with Old Architecture if memory is tight
- Use Llama 3.2 1B model (~600MB) instead of 3B (~1.8GB)
- Reanimated 3.x if staying on Old Architecture

**If adding offline-first sync later:**
- Keep MMKV for hot data (current conversation)
- Add expo-sqlite for structured historical data
- Consider WatermelonDB for complex sync scenarios

**If targeting App Store quickly:**
- Use expo-dev-client from day one
- Configure EAS Build early for TestFlight
- Maestro E2E tests can run on EAS Workflows

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 54 | React Native 0.81, React 19.1 | New Architecture enabled by default |
| llama.rn 0.9.x | Old + New Architecture | v0.10+ requires New Architecture only |
| react-native-mmkv 4.x | React Native 0.74+ | Requires New Architecture (Nitro Modules) |
| Reanimated 4.x | React Native 0.80+ | Requires New Architecture |
| Uniwind 1.x | Tailwind 4, Expo SDK 52+ | Build-time compilation |
| React Navigation 7.x | Expo SDK 52+, RN 0.72+ | Works in Expo Go (SDK 52+) or dev builds |

## Architecture Implications

### New Architecture Required
This stack effectively requires React Native's New Architecture:
- MMKV V4 (Nitro Modules)
- Reanimated 4.x (Fabric only)
- Expo SDK 54 (New Arch default, Legacy removed in SDK 55)

**Recommendation:** Enable New Architecture from project start. SDK 54 is the last SDK supporting Legacy Architecture opt-out.

### Development Build Required
llama.rn is a native module that cannot run in Expo Go. You must use:
```bash
npx expo prebuild
npx expo run:ios
# Or use EAS Build for cloud builds
```

### Model Download Strategy
The ~1.8GB model download requires careful handling:
- Use `expo-file-system.createDownloadResumable()` for pause/resume
- Store in `FileSystem.documentDirectory` (persists across app updates)
- Show progress UI during download
- Handle interrupted downloads gracefully (store resumable state)

## Sources

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - SDK features, React Native 0.81 support
- [llama.rn GitHub](https://github.com/mybigday/llama.rn) - v0.9.1 requirements, API documentation
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) - V4 API, Nitro Modules requirement
- [Uniwind Docs](https://docs.uniwind.dev) - v1.0.0 features, Tailwind 4 support
- [react-native-voice GitHub](https://github.com/react-native-voice/voice) - v3.2.4, Expo config plugin
- [React Navigation Upgrade Guide](https://reactnavigation.org/docs/upgrading-from-6.x/) - v7 static API
- [Reanimated 4 Release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713) - v4.2.1, CSS animations
- [Expo File System Docs](https://docs.expo.dev/versions/v53.0.0/sdk/filesystem/) - downloadResumable API
- [Expo Unit Testing Docs](https://docs.expo.dev/develop/unit-testing/) - jest-expo setup
- [Maestro React Native Support](https://docs.maestro.dev/platform-support/react-native) - E2E testing
- [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native) - Icon library
- [Zustand GitHub](https://github.com/pmndrs/zustand) - State management

---
*Stack research for: Confidant - Local-first emotional companion iOS app*
*Researched: 2026-01-16*
