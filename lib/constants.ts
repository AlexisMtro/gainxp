// Formule de calcul XP nécessaire par niveau
export const XP_PER_LEVEL = (level: number): number => level * 1000;

// XP gagné par type d'action
export const XP_REWARDS = {
  SESSION_COMPLETE: 100,
  EXERCISE_COMPLETE: 10,
  STREAK_BONUS: 50,
  FIRST_SESSION: 200,
  PROGRAM_COMPLETE: 500,
} as const;

// Noms des niveaux / rangs
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Novice',
  5: 'Apprenti',
  10: 'Guerrier',
  20: 'Champion',
  30: 'Élite',
  50: 'Légende',
};

// Durées de repos recommandées (en secondes)
export const REST_DURATIONS = {
  SHORT: 30,
  MEDIUM: 60,
  LONG: 90,
  EXTRA_LONG: 120,
} as const;

// Couleurs du thème (alignées avec tailwind.config.js)
export const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  accent: '#43E97B',
  xp: '#FFD700',
  background: '#0F0F1A',
  card: '#1A1A2E',
  elevated: '#252540',
} as const;
