# Phase 4: Polish - Research

**Researched:** 2026-01-17
**Domain:** Mobile app onboarding, settings screens, TestFlight distribution, and app store assets
**Confidence:** HIGH

## Summary

Phase 4 delivers user-facing polish and prepares the app for TestFlight distribution. Research focused on five key areas: onboarding implementation using MMKV (already in project) for first-launch detection, settings screen patterns for crisis resources and data management, TestFlight submission via EAS, app icon/splash screen configuration in Expo, and disclaimer presentation for mental health apps.

The project already uses MMKV for storage (30x faster than AsyncStorage), which simplifies onboarding state management. Expo provides comprehensive tooling for app icons, splash screens, and TestFlight submission via EAS CLI. Mental health app disclaimers follow established patterns with 2026 regulatory considerations around AI chatbots.

**Primary recommendation:** Use MMKV for onboarding state (already integrated), implement settings as a simple ScrollView with crisis resource buttons matching CrisisModal design, configure splash screen via app.config.js (already in place), and submit to TestFlight via `npx testflight` command for streamlined workflow.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-mmkv | 4.1.1 (Nitro) | First-launch detection and settings persistence | Already in project; 30x faster than AsyncStorage; synchronous access prevents race conditions |
| expo-splash-screen | 31.0.13 | Splash screen control and configuration | Built into Expo SDK; handles iOS/Android differences; supports manual hide control |
| EAS CLI | Latest | Build and submit to TestFlight | Official Expo tooling; single command submission; handles code signing |
| expo-router | 6.0.21 | Navigation including settings screen | Already in project; file-based routing matches Expo patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-onboarding-swiper | 1.2.0+ | Pre-built onboarding carousel UI | If multi-screen tutorial needed (NOT recommended for this app - privacy explanation is simple) |
| expo-web-browser | 15.0.10 | Open external privacy policy URLs | Already in project; use if privacy policy needs external link |
| expo-haptics | 15.0.8 | Tactile feedback on settings actions | Already in project; use for delete confirmation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MMKV | AsyncStorage (@react-native-async-storage/async-storage v2.2.0) | AsyncStorage is slower (30x) and async, but more widely documented. MMKV already integrated and superior. |
| Custom onboarding | react-native-onboarding-swiper | Library adds dependency for simple 2-3 screen flow. Custom implementation keeps bundle smaller and matches app design. |
| Manual EAS commands | `npx testflight` | Single command vs `eas build` + `eas submit`. npx testflight streamlines workflow for iOS-only apps. |

**Installation:**
```bash
# All core dependencies already installed
# No new packages required for basic implementation

# Optional: If onboarding library preferred (NOT recommended)
# npx expo install react-native-onboarding-swiper
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── screens/
│   ├── OnboardingScreen.tsx      # First-launch flow (privacy, name, disclaimer)
│   └── SettingsScreen.tsx        # Crisis resources, clear data, disclaimer link
├── components/
│   ├── onboarding/
│   │   ├── PrivacyStep.tsx       # Explains local-only architecture
│   │   ├── NameStep.tsx          # Collects user's preferred name
│   │   └── DisclaimerStep.tsx    # Not-a-therapy disclaimer with acknowledgment
│   └── settings/
│       ├── SettingsSection.tsx   # Grouped settings with header
│       ├── CrisisResourceCard.tsx # Crisis hotline buttons (reuses CrisisModal design)
│       └── DangerZone.tsx        # Clear all data with confirmation
├── stores/
│   └── onboardingStore.ts        # MMKV-backed onboarding state
└── constants/
    ├── crisisResources.ts        # 988, 741741 (shared with CrisisModal)
    └── disclaimer.ts             # Disclaimer text (single source of truth)
```

### Pattern 1: First-Launch Detection with MMKV
**What:** Synchronous check on app mount to determine if onboarding is needed
**When to use:** Every app launch to route user to onboarding or main app
**Example:**
```typescript
// src/stores/onboardingStore.ts
import { create } from 'zustand';
import { storage } from '../storage/storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const USER_NAME_KEY = 'user_name';

interface OnboardingState {
  completed: boolean;
  userName: string | null;
  completeOnboarding: (name: string) => void;
  checkOnboardingStatus: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: false,
  userName: null,

  completeOnboarding: (name: string) => {
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    storage.set(USER_NAME_KEY, name);
    set({ completed: true, userName: name });
  },

  checkOnboardingStatus: () => {
    const completed = storage.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
    const userName = storage.getString(USER_NAME_KEY) ?? null;
    set({ completed, userName });
  },
}));
```

### Pattern 2: Manual Splash Screen Control
**What:** Keep splash screen visible during onboarding check, hide after routing decision
**When to use:** App initialization to prevent flash of wrong screen
**Example:**
```typescript
// app/_layout.tsx (root layout)
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useOnboardingStore } from '../stores/onboardingStore';

// CRITICAL: Call in global scope before component definition
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { completed, checkOnboardingStatus } = useOnboardingStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Check onboarding status (synchronous with MMKV)
        checkOnboardingStatus();
        // Load other critical resources (fonts, etc)
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  // Route to onboarding or main app based on completed flag
  return completed ? <MainApp /> : <OnboardingScreen />;
}
```

### Pattern 3: Settings Screen with Crisis Resources
**What:** ScrollView-based settings screen matching iOS design patterns
**When to use:** Settings navigation route
**Example:**
```typescript
// src/screens/SettingsScreen.tsx
import { ScrollView, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../stores/chatStore';
import { useMemoryStore } from '../stores/memoryStore';

export function SettingsScreen() {
  const clearConversation = useChatStore((state) => state.clearConversation);
  const clearMemories = useMemoryStore((state) => state.clearAll);

  const handleCall988 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:988');
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all conversations and memories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearConversation();
            clearMemories();
            // Onboarding state NOT cleared - user stays past onboarding
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Crisis Resources Section */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
          Crisis Resources
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#DC2626', padding: 16, borderRadius: 14, marginBottom: 12 }}
          onPress={handleCall988}
        >
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>Call 988</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
            Suicide & Crisis Lifeline
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, color: '#8E8E93' }}>
          Available 24/7, free and confidential
        </Text>
      </View>

      {/* Disclaimer Section */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
          About This App
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: '#3C3C43' }}>
          Confidant is not a substitute for professional mental health care, therapy, or medical advice.
          If you are experiencing a crisis, please contact 988 or emergency services.
        </Text>
      </View>

      {/* Danger Zone */}
      <View>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12, color: '#DC2626' }}>
          Danger Zone
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#FEE2E2', padding: 16, borderRadius: 14 }}
          onPress={handleClearAllData}
        >
          <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '600' }}>
            Clear All Data
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

### Pattern 4: Disclaimer Acknowledgment with Checkbox
**What:** Require user to explicitly acknowledge disclaimer before completing onboarding
**When to use:** Final step of onboarding flow
**Example:**
```typescript
// src/components/onboarding/DisclaimerStep.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisclaimerStepProps {
  onAcknowledge: () => void;
}

export function DisclaimerStep({ onAcknowledge }: DisclaimerStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 16 }}>
        Important Notice
      </Text>

      <ScrollView style={{ flex: 1, marginBottom: 24 }}>
        <Text style={{ fontSize: 16, lineHeight: 24, color: '#3C3C43' }}>
          Confidant is designed to be a private space for reflection and emotional expression.
          However, it is important to understand:
        </Text>

        <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 16, color: '#3C3C43' }}>
          • This app is NOT a substitute for professional mental health care, therapy, or medical advice.
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 8, color: '#3C3C43' }}>
          • Conversations are generated by an on-device AI and should not be considered professional guidance.
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 8, color: '#3C3C43' }}>
          • If you are experiencing a crisis or suicidal thoughts, please contact 988 immediately.
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 8, color: '#3C3C43' }}>
          • For ongoing mental health concerns, please consult a licensed mental health professional.
        </Text>
      </ScrollView>

      {/* Checkbox */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
        onPress={() => setAcknowledged(!acknowledged)}
        activeOpacity={0.7}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: acknowledged ? '#007AFF' : '#C7C7CC',
            backgroundColor: acknowledged ? '#007AFF' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          {acknowledged && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
        <Text style={{ fontSize: 16, color: '#3C3C43', flex: 1 }}>
          I understand and acknowledge this disclaimer
        </Text>
      </TouchableOpacity>

      {/* Continue Button */}
      <TouchableOpacity
        style={{
          backgroundColor: acknowledged ? '#007AFF' : '#F2F2F7',
          padding: 16,
          borderRadius: 14,
          opacity: acknowledged ? 1 : 0.6,
        }}
        onPress={onAcknowledge}
        disabled={!acknowledged}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: acknowledged ? '#FFF' : '#8E8E93',
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Anti-Patterns to Avoid
- **AsyncStorage for onboarding state:** Project uses MMKV; don't introduce AsyncStorage for this feature. Asynchronous reads create race conditions during app initialization.
- **Third-party onboarding libraries:** Simple 2-3 screen flows don't justify additional dependencies. Custom implementation maintains design consistency and smaller bundle size.
- **Clearing onboarding flag with "clear all data":** Users expect "clear all data" to reset conversations/memories, NOT force them back through onboarding. Keep onboarding_completed flag separate.
- **Auto-hiding splash screen:** Default behavior shows onboarding/main app momentarily before routing decision. Use SplashScreen.preventAutoHideAsync() to avoid flicker.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App icon generation | Manual PNG export at all iOS sizes (20pt@1x/2x/3x through 1024pt) | Expo app.config.js with single 1024x1024 PNG | Expo generates all required sizes automatically; manual generation prone to sizing errors that fail App Store validation |
| Splash screen implementation | Custom native splash screen code in Xcode | expo-splash-screen plugin in app.config.js | Handles iOS/Android differences; provides hide() API for manual control; regenerated on prebuild |
| TestFlight code signing | Manual certificate management in Apple Developer portal | EAS Build with managed credentials | EAS handles provisioning profiles, certificates, and App Store Connect API keys automatically |
| Form validation for name input | Custom regex and state management | Simple non-empty check with trim() | Name collection is optional for personalization - any non-empty string is valid; complex validation adds unnecessary friction |
| Deep linking for settings | Custom URL scheme configuration | expo-router with file-based routing | Settings screen is a simple route; deep linking handled automatically by expo-router if needed later |

**Key insight:** Expo's tooling ecosystem (EAS, expo-splash-screen, app.config.js) handles native iOS complexity automatically. Manual native code introduces maintenance burden and platform-specific bugs. Use Expo's abstractions unless blocked by specific limitation.

## Common Pitfalls

### Pitfall 1: Splash Screen Visible Too Long
**What goes wrong:** Users see splash screen for 5+ seconds while resources load, creating perception of slow app
**Why it happens:** Developers use SplashScreen.preventAutoHideAsync() but forget to call hideAsync() promptly, or perform slow operations before hiding
**How to avoid:**
- Only load critical resources before hiding (onboarding state check is synchronous with MMKV)
- Hide splash screen as soon as routing decision is made (onboarding vs main app)
- Defer non-critical loads (fonts, images) to after splash screen hides
**Warning signs:**
- Splash screen visible > 2 seconds on modern devices
- Users report "app feels slow to start"

### Pitfall 2: App Store Screenshot Size Rejection
**What goes wrong:** Screenshots uploaded to App Store Connect are rejected for being 1 pixel off required dimensions
**Why it happens:** Apple requires exact pixel dimensions (1290x2796 or 1320x2868 for iPhone 6.9"); even 1px deviation fails validation
**How to avoid:**
- Use Expo's screenshot guide and Figma templates with exact dimensions
- Verify screenshot dimensions before upload: `sips -g pixelWidth -g pixelHeight screenshot.png`
- Test upload to App Store Connect early in process to catch sizing issues
**Warning signs:**
- App Store Connect shows "Invalid Binary" or dimension error
- Screenshots appear stretched or letterboxed in preview

### Pitfall 3: MMKV Storage Key Conflicts
**What goes wrong:** Clearing all data also clears onboarding state, forcing user back through onboarding after data reset
**Why it happens:** storage.clearAll() removes ALL keys including onboarding_completed; no key namespacing
**How to avoid:**
- Use selective removal for "clear all data": only remove chat_messages, conversation_meta, and memories keys
- Do NOT use storage.clearAll() for user-facing "clear all data" action
- Document which keys are user data vs app state in storage/storage.ts
**Warning signs:**
- Users report being sent back to onboarding after clearing data
- Unexpected logout or state reset after data operations

### Pitfall 4: TestFlight Build Expires Before External Testing
**What goes wrong:** Build uploaded to TestFlight but expired (90 days) before external testers invited
**Why it happens:** Internal testing (automatic) vs external testing (requires App Review) confusion; external testing needs Apple review which takes days
**How to avoid:**
- Submit for Beta App Review immediately after internal testing validates build
- External testers can't access build until Apple approves (1-2 days typical)
- Plan for 7-day buffer between upload and external distribution
**Warning signs:**
- "This build is no longer available" in TestFlight for external testers
- Build shows "Expired" status in App Store Connect

### Pitfall 5: Crisis Resources Not Accessible During Onboarding
**What goes wrong:** User experiences crisis during onboarding flow but crisis resources only in settings screen (not yet accessible)
**Why it happens:** Crisis detection only active in chat; onboarding has no crisis resource visibility
**How to avoid:**
- Add "If you're in crisis" footer to every onboarding screen with 988 call link
- Crisis resources must be accessible BEFORE completing onboarding
- Consider persistent bottom sheet or link on all onboarding screens
**Warning signs:**
- Onboarding screens have no crisis resource mentions
- No way to contact crisis hotline until app fully set up

### Pitfall 6: Disclaimer Text Duplication
**What goes wrong:** Disclaimer text differs between onboarding screen and settings screen, creating legal inconsistency
**Why it happens:** Disclaimer copy-pasted between components instead of single source of truth
**How to avoid:**
- Define disclaimer text in src/constants/disclaimer.ts
- Import constant in both DisclaimerStep and SettingsScreen
- Update disclaimer in one place for both locations
**Warning signs:**
- Git diff shows different disclaimer wording in multiple files
- Settings disclaimer doesn't match onboarding disclaimer

## Code Examples

Verified patterns from official sources:

### Clear All Data (MMKV Selective Removal)
```typescript
// Source: MMKV documentation + project pattern
// https://github.com/mrousavy/react-native-mmkv

import { storage } from '../storage/storage';

export function clearUserData() {
  // ONLY remove user data keys, NOT app state
  const userDataKeys = [
    'chat_messages',
    'conversation_meta',
    'memories',
    // Add other user data keys as needed
  ];

  userDataKeys.forEach((key) => {
    storage.remove(key);
  });

  // Do NOT remove:
  // - onboarding_completed
  // - user_name
  // - model_download_path
}

// WRONG: This clears onboarding state too
// storage.clearAll(); // ❌ Don't use for user-facing data reset
```

### App Icon and Splash Screen Configuration
```javascript
// Source: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
// app.config.js (already in project)

module.exports = {
  expo: {
    icon: './assets/images/icon.png', // 1024x1024 PNG, square, no transparency
    splash: {
      image: './assets/images/splash-icon.png', // 1024x1024 PNG, transparent background
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200, // Size of icon within splash screen
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000', // Dark mode splash background
          },
        },
      ],
    ],
    ios: {
      bundleIdentifier: 'ca.corvustech.confidant', // Required for App Store
      // ... rest of iOS config
    },
  },
};
```

### EAS Build and Submit Configuration
```json
// Source: https://docs.expo.dev/build/eas-json/
// eas.json

{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "default"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

### TestFlight Submission (Single Command)
```bash
# Source: https://docs.expo.dev/build-reference/npx-testflight/
# Single command build, sign, and submit to TestFlight

npx testflight

# Or with changelog
npx testflight --what-to-test "Initial beta: chat, memory, onboarding complete"

# Or with specific groups
npx testflight --groups "Friends,Testers"
```

### Name Input with Simple Validation
```typescript
// Source: React Native TextInput documentation + project patterns
// Simple validation - name is optional, any non-empty string is valid

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export function NameStep({ onComplete }: { onComplete: (name: string) => void }) {
  const [name, setName] = useState('');
  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 16 }}>
        What should I call you?
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: '#8E8E93', marginBottom: 24 }}>
        This helps personalize our conversations. You can use any name you prefer.
      </Text>

      <TextInput
        style={{
          fontSize: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: '#C7C7CC',
          borderRadius: 14,
          marginBottom: 24,
        }}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => isValid && onComplete(trimmedName)}
      />

      <TouchableOpacity
        style={{
          backgroundColor: isValid ? '#007AFF' : '#F2F2F7',
          padding: 16,
          borderRadius: 14,
          opacity: isValid ? 1 : 0.6,
        }}
        onPress={() => onComplete(trimmedName)}
        disabled={!isValid}
      >
        <Text
          style={{
            color: isValid ? '#FFF' : '#8E8E93',
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for local state | MMKV (Nitro Modules) | MMKV v4.0+ (2024) | Synchronous access prevents race conditions during app init; 30x faster; v4 uses Nitro architecture |
| Manual EAS build + submit | `npx testflight` single command | Expo SDK 52 (late 2024) | Streamlined workflow for iOS-only apps; fewer commands to remember |
| AppLoading (deprecated) | SplashScreen.preventAutoHideAsync() | Expo SDK 50+ (2024) | Better control over splash visibility; works with Expo Router |
| Pre-generated app icons at all sizes | Single 1024x1024 PNG in app.config.js | Expo SDK 48+ (standard practice) | Expo generates all required sizes; prevents sizing errors |
| Beta App Review manual submission | Automatic with external groups in eas.json | App Store Connect 2024 update | Streamlined external testing; review happens automatically when external groups configured |

**Deprecated/outdated:**
- **AppLoading from expo:** Use SplashScreen.preventAutoHideAsync() instead (AppLoading removed in SDK 50+)
- **AsyncStorage from @react-native-community:** Moved to @react-native-async-storage/async-storage, but MMKV preferred for this use case
- **Manual app icon generation:** Expo handles icon generation; no need for manual PNG exports at multiple sizes
- **"Checked by default" GDPR checkboxes:** 2026 regulations require opt-in (unchecked by default) for data collection; doesn't apply to this app (local-only) but good practice for disclaimer acknowledgment

## Open Questions

Things that couldn't be fully resolved:

1. **Mental health app specific regulatory requirements**
   - What we know: California has 2026 legislation for companion chatbots requiring suicide prevention protocols; general medical disclaimers recommended but not legally required for non-HIPAA apps
   - What's unclear: Whether iOS-only local app falls under California chatbot legislation (no data transmission, on-device only)
   - Recommendation: Include disclaimer as best practice; monitor state legislation; app's local-only architecture likely exempt from most data regulations

2. **TestFlight external testing Beta App Review timeline**
   - What we know: External testing requires Apple Beta App Review (separate from App Store Review); typically 1-2 days; builds expire after 90 days
   - What's unclear: Exact criteria for Beta App Review rejection vs approval; whether crisis detection feature requires special review
   - Recommendation: Plan 3-5 day buffer for Beta App Review before external testers need access; have disclaimer clearly visible in first-run experience

3. **Optimal onboarding flow length**
   - What we know: Apps with interactive onboarding see 50% better day-7 retention; privacy-focused apps need to explain data handling clearly
   - What's unclear: Whether 3-screen flow (privacy, name, disclaimer) is too long for users eager to try the app
   - Recommendation: Start with 3-screen flow; measure drop-off at each screen; consider A/B testing 2-screen variant (combine privacy + name) if abandonment rate >20%

4. **Crisis resources during onboarding accessibility**
   - What we know: Crisis resources must be accessible before app is fully set up; onboarding screens should have crisis links
   - What's unclear: Best UX pattern for crisis resources on onboarding screens without cluttering minimal design
   - Recommendation: Small footer text on each onboarding screen: "In crisis? Call 988" with tap-to-call link; matches minimal design while ensuring access

5. **App Store screenshot requirements for mental health apps**
   - What we know: Apple requires 2-10 screenshots at exact dimensions (1290x2796 or 1320x2868 for iPhone 6.9"); must show actual app functionality
   - What's unclear: Whether mental health app screenshots require specific disclaimers or warnings visible in screenshots themselves
   - Recommendation: Include disclaimer in one screenshot (e.g., settings screen showing disclaimer); monitor App Review feedback; no specific requirements found in research

## Sources

### Primary (HIGH confidence)
- [Expo AsyncStorage Documentation](https://docs.expo.dev/versions/latest/sdk/async-storage/) - Installation, API, compatibility
- [Expo Splash Screen and App Icon Guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/) - Specifications, configuration
- [Expo SplashScreen API Documentation](https://docs.expo.dev/versions/latest/sdk/splash-screen/) - preventAutoHideAsync(), hideAsync() methods
- [Expo EAS Submit Documentation](https://docs.expo.dev/submit/ios/) - TestFlight submission prerequisites
- [Expo Store Assets Guide](https://docs.expo.dev/guides/store-assets/) - App Store and Google Play asset requirements
- [Expo EAS.json Configuration](https://docs.expo.dev/build/eas-json/) - Build and submit profiles
- [React Native MMKV GitHub](https://github.com/mrousavy/react-native-mmkv) - v4 Nitro Modules API
- [988 Suicide & Crisis Lifeline](https://988lifeline.org/) - Official US crisis resource
- [9-8-8 Canada](https://988.ca/) - Official Canadian crisis resource
- [Crisis Text Line](https://www.crisistextline.org/) - Text HOME to 741741

### Secondary (MEDIUM confidence)
- [React Native Onboarding Swiper GitHub](https://github.com/jfilter/react-native-onboarding-swiper) - Library patterns verified against React Native docs
- [MMKV vs AsyncStorage Performance Comparison](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/) - Benchmark data from multiple sources
- [Mobile Mental Health Apps Legal Analysis - Winston & Strawn](https://www.winston.com/en/blogs-and-podcasts/benefits-blast/mobile-mental-health-apps-employers-need-to-be-mindful-of-legal-traps-when-offering-telemental-health-benefits) - 2026 regulatory landscape
- [Medical Disclaimer Best Practices - Usercentrics](https://usercentrics.com/guides/website-disclaimers/medical-disclaimers/) - Standard disclaimer language
- [React Hook Form Validation - Medium](https://medium.com/@aavashdahal2/react-hook-form-validation-is-easy-react-native-777785ec1422) - Validation patterns (simple validation chosen over library)

### Tertiary (LOW confidence - for awareness)
- [React Native Best Practices 2026 - eSpark](https://www.esparkinfo.com/blog/react-native-best-practices) - General guidance, not phase-specific
- [Dark Pattern Avoidance 2026 - SecurePrivacy](https://secureprivacy.ai/blog/dark-pattern-avoidance-2026-checklist) - Checkbox consent patterns
- WebSearch: "mental health app disclaimer" - Multiple sources agree on best practices but no legal mandate found for this app type

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (MMKV, expo-splash-screen, EAS CLI) with official documentation
- Architecture: HIGH - Patterns verified against official Expo docs and existing project structure (chatStore, memoryStore patterns)
- Pitfalls: MEDIUM - Based on community reports and documentation warnings, not firsthand testing in this project yet
- Disclaimer requirements: MEDIUM - Best practices clear, but legal requirements for local-only iOS app uncertain (California 2026 legislation applies to data-transmitting chatbots)
- TestFlight workflow: HIGH - Official Expo documentation with clear command structure

**Research date:** 2026-01-17
**Valid until:** ~30 days (Expo SDK updates quarterly; mental health regulations evolving in 2026; TestFlight process stable)

**Key dependencies already in project:**
- MMKV 4.1.1 (Nitro) - first-launch detection, settings persistence
- expo-splash-screen 31.0.13 - manual control of splash visibility
- expo-haptics 15.0.8 - tactile feedback for settings actions
- expo-web-browser 15.0.10 - potential external links (privacy policy)
- EAS CLI (via npx) - TestFlight submission

**No new dependencies required for basic implementation.** Optional: react-native-onboarding-swiper if library-based approach preferred (NOT recommended - custom implementation maintains design consistency and smaller bundle).
