# Pitch & Putt YVR

React Native + Expo app focused on score tracking for Pitch & Putt rounds.

## Architecture

- **Frontend**: Expo Router routes in `app/`
- **Domain logic**: `src/pitchputt/`
- **Auth/backend**: Supabase client in `src/lib/supabase.ts`
- **State**: Zustand stores in `src/pitchputt/store.ts`

## Core Flows

- User authentication (`app/auth.tsx`)
- Round setup (`app/player-setup.tsx`)
- Hole-by-hole scoring (`app/hole.tsx`, `app/hole-picker.tsx`)
- Final scorecard + round history (`app/final-scorecard.tsx`, `app/(tabs)/history.tsx`)
- Aggregate stats (`app/(tabs)/stats.tsx`)

## Commands

```bash
npm run start
npm run ios
npm run android
npm run lint
```
