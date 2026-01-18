---
phase: 04-polish
plan: 04
subsystem: deployment
requires: [eas-cli, apple-developer-account]
provides: [testflight-distribution]
affects: [eas.json, package.json]
tech-stack: [eas, testflight, app-store-connect]
key-files:
  - eas.json
  - package.json
key-decisions:
  - decision: "Empty ios submit config for interactive prompts"
    rationale: "EAS prompts for credentials interactively, avoiding hardcoded values"
  - decision: "Added build:ios and submit:ios npm scripts"
    rationale: "Convenience scripts for common EAS operations"
  - decision: "Disabled extended memory entitlements"
    rationale: "Provisioning profile didn't support them; can enable later via Apple Developer Portal"
  - decision: "Added NSPhotoLibraryUsageDescription"
    rationale: "Required by App Store Connect even if app doesn't use photo library (dependency references API)"
---

# Summary: TestFlight Submission

## What Was Built

Successfully built and deployed Cove to TestFlight for beta distribution.

## Deliverables

| Artifact | Status | Notes |
|----------|--------|-------|
| eas.json | ✓ | Production build and submit configuration |
| package.json scripts | ✓ | Added build:ios and submit:ios convenience scripts |
| EAS Build | ✓ | Production IPA built successfully |
| TestFlight | ✓ | App submitted and installable |

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Configure EAS and build | (during session) | eas.json, package.json |
| 2 | TestFlight submission | (human action) | App Store Connect |

## Technical Decisions

1. **Disabled extended memory entitlements** — Provisioning profile didn't include `com.apple.developer.kernel.extended-virtual-addressing`. Can enable later in Apple Developer Portal if needed for older devices.

2. **Added NSPhotoLibraryUsageDescription** — App Store Connect requires this even though app doesn't access photos (dependency references the API).

3. **Interactive submit config** — Left `ios: {}` in submit profile to let EAS prompt for credentials interactively.

## Issues Encountered

1. **Plugin resolution error** — `@jamsch/expo-speech-recognition` was referenced in app.config.js but not in package.json. Fixed by adding `expo-speech-recognition` (new package name).

2. **Provisioning profile error** — Extended memory entitlements not supported. Fixed by setting `enableEntitlements: false` in withLlamaRN plugin.

3. **Missing usage description** — App Store Connect rejected for missing NSPhotoLibraryUsageDescription. Added to infoPlist.

4. **Apple server error** — Intermittent 500 error during API key generation. Resolved on retry.

## Verification

- [x] App builds successfully via EAS
- [x] App uploaded to TestFlight
- [x] App installable by beta testers
- [x] App icon displays correctly
- [x] Splash screen shows on launch
- [x] Onboarding flow works
- [x] Chat and settings functional

## Duration

~15 minutes (including Apple server retry)
