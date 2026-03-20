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

## Git Workflow

- `master` → branche stable / production
- `develop` → branche d'intégration principale
- `feature/nom-feature` → une branche par feature, créée depuis `develop`

Workflow pour chaque feature :
1. `git checkout develop && git pull`
2. `git checkout -b feature/nom-feature`
3. Développement + commits
4. PR de `feature/nom-feature` → `develop`
5. Merge dans `develop` une fois validé
6. Merge de `develop` → `master` pour les releases
