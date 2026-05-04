# Pitch & Putt YVR

Mobile scorekeeping app for Pitch & Putt rounds built with Expo + React Native.

## Local Development

```bash
npm install
npm run start
```

Useful scripts:

- `npm run ios` - run iOS dev build on device/simulator
- `npm run android` - run Android dev build
- `npm run lint` - run lint checks

## Environment

Copy `.env.example` to `.env` and provide:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- OAuth client IDs for Google sign-in

## App Structure

- `app/` - Expo Router routes (auth, tabs, scoring flows)
- `src/pitchputt/` - pitch & putt domain logic (courses, scoring, stores, types)
- `src/lib/` - shared integrations (Supabase client)
- `supabase/` - schema and seed SQL for backend setup

## Build

- Development client: `eas build --profile development --platform ios|android`
- Internal preview: `eas build --profile preview --platform ios|android`
- Production: `eas build --profile production --platform ios|android`
