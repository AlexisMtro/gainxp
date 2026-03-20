# GainXP — Application mobile sport gamifiée

## Stack
- React Native (Expo SDK 51+), TypeScript strict
- Navigation : Expo Router
- State : Zustand
- Backend : Supabase
- Styling : NativeWind
- Animations : Reanimated 3

## Structure
- app/ → écrans (Expo Router)
- components/ → UI réutilisable
- hooks/ → logique métier
- stores/ → Zustand stores
- lib/ → supabase.ts, constants.ts, utils.ts
- types/ → types TypeScript globaux

## Règles
- TypeScript strict, pas de `any`
- Composants fonctionnels uniquement
- Custom hooks pour toute la logique
- Toujours gérer loading / error / empty
- Code en anglais, commentaires en français