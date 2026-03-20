import type { Level } from '@/types/index';

// ─── XP ──────────────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  COMPLETE_SESSION: 100,   // Séance complétée
  COMPLETE_SET: 5,         // Série complétée
  DAILY_TASK_STEPS: 50,    // Objectif de pas atteint
  STREAK_BONUS_7: 200,     // 7 jours de streak consécutifs
  PERFECT_SESSION: 50,     // Toutes les séries complétées sans abandon
} as const;

// ─── Niveaux ─────────────────────────────────────────────────────────────────

// 8 niveaux du débutant à la légende, avec couleur et icône par palier
export const LEVELS: Level[] = [
  { level: 1, name: 'Débutant',     xp_required: 0,      badge_color: '#9CA3AF', icon: 'seedling'  },
  { level: 2, name: 'Apprenti',     xp_required: 500,    badge_color: '#34D399', icon: 'shield'    },
  { level: 3, name: 'Guerrier',     xp_required: 1500,   badge_color: '#60A5FA', icon: 'sword'     },
  { level: 4, name: 'Athlète',      xp_required: 4000,   badge_color: '#818CF8', icon: 'dumbbell'  },
  { level: 5, name: 'Champion',     xp_required: 9000,   badge_color: '#A78BFA', icon: 'trophy'    },
  { level: 6, name: 'Maître',       xp_required: 18000,  badge_color: '#F59E0B', icon: 'crown'     },
  { level: 7, name: 'Élite',        xp_required: 35000,  badge_color: '#F97316', icon: 'flame'     },
  { level: 8, name: 'Légende',      xp_required: 60000,  badge_color: '#EF4444', icon: 'star'      },
];

// ─── Couleurs ─────────────────────────────────────────────────────────────────

// Palette sombre violet/indigo — alignée avec tailwind.config.js
export const COLORS = {
  // Fond
  background:      '#0F0F1A',
  backgroundCard:  '#1A1A2E',
  backgroundElevated: '#252540',

  // Primaires
  primary:         '#6C63FF',
  primaryDark:     '#5A52D5',
  primaryLight:    '#8B84FF',

  // Accents
  secondary:       '#FF6584',
  accent:          '#43E97B',
  xp:              '#FFD700',

  // Indigo/violet supplémentaires
  indigo:          '#6366F1',
  violet:          '#8B5CF6',
  purple:          '#A855F7',

  // Utilitaires
  success:         '#10B981',
  warning:         '#F59E0B',
  error:           '#EF4444',

  // Texte
  textPrimary:     '#FFFFFF',
  textSecondary:   '#9CA3AF',
  textMuted:       '#4B5563',
} as const;

export type ColorKey = keyof typeof COLORS;
