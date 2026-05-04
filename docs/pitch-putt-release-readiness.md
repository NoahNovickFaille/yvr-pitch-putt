# Pitch & Putt YVR - Release Readiness

## Local development

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and set Supabase values.
3. Start Expo:
   - `npm run start`
4. Phone testing:
   - Expo Go path: scan the QR code from `npm run start`.
   - Native auth path (Apple/Google): build dev client with `eas build --profile development --platform ios` and `eas build --profile development --platform android`.

## Supabase setup

1. Enable providers in Supabase Auth:
   - Apple
   - Google
   - Email/Password
2. Add redirect URLs:
   - `pitchputt://auth`
   - `pitchputt-dev://auth`
3. Run SQL migration in `supabase/migrations/20260428093000_pitch_putt_schema.sql`.
4. Run seed SQL in `supabase/seed/20260428_pitch_putt_seed.sql`.

## Hole illustrations

- Current hole rendering uses `src/pitchputt/holeAssets.ts` typed map and local bundled fallback image.
- Replace fallback with per-hole assets in a deterministic scheme (`course-slug/hole-n`) when design exports are available.

## Build profiles

- Development client: `eas build --profile development --platform ios|android`
- Internal preview: `eas build --profile preview --platform ios|android`
- Production: `eas build --profile production --platform ios|android`

## QA checklist

- [ ] Sign in with email/password
- [ ] Sign in with Apple (iOS dev build)
- [ ] Sign in with Google (iOS + Android dev builds)
- [ ] Start a round and score holes 1-18
- [ ] Jump to hole and edit prior scores
- [ ] Complete round and confirm history + stats updates
