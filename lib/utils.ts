import type { Level } from '@/types/index';
import { LEVELS } from './constants';

// ─── Niveaux & XP ────────────────────────────────────────────────────────────

/**
 * Retourne le niveau correspondant au total XP donné.
 * Renvoie le niveau le plus élevé dont xp_required <= totalXP.
 */
export function getLevelFromXP(totalXP: number): Level {
  // Parcours depuis le niveau max vers le min pour trouver le premier seuil atteint
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xp_required) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/**
 * Retourne la progression (0–100) dans le niveau actuel.
 * Ex : si le joueur a 700 XP et que le niveau 2 va de 500 à 1500, retourne 20.
 */
export function getXPProgressPercent(totalXP: number): number {
  const currentLevel = getLevelFromXP(totalXP);
  const currentIndex = LEVELS.findIndex((l) => l.level === currentLevel.level);
  const nextLevel = LEVELS[currentIndex + 1];

  // Déjà au niveau max
  if (!nextLevel) return 100;

  const xpIntoLevel = totalXP - currentLevel.xp_required;
  const xpNeeded = nextLevel.xp_required - currentLevel.xp_required;

  return Math.min(Math.round((xpIntoLevel / xpNeeded) * 100), 100);
}

// ─── Formatage ───────────────────────────────────────────────────────────────

/**
 * Formate une durée en secondes en chaîne lisible.
 * Ex : 5000 → "1h 23min" | 90 → "1min 30s" | 45 → "45s"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}min ${secs}s` : `${minutes}min`;
  }
  return `${secs}s`;
}

// ─── Calories ────────────────────────────────────────────────────────────────

/**
 * Intensité de l'entraînement — détermine le MET (Metabolic Equivalent of Task).
 * low ≈ étirements/yoga, medium ≈ musculation, high ≈ HIIT/cardio intense.
 */
type Intensity = 'low' | 'medium' | 'high';

const MET: Record<Intensity, number> = {
  low:    3.0,
  medium: 5.0,
  high:   8.0,
};

/**
 * Estime les calories brûlées via la formule MET.
 * Formule : Calories = MET × poids(kg) × durée(h)
 *
 * @param durationSeconds - Durée de la séance en secondes
 * @param intensity       - Intensité de l'effort
 * @param weightKg        - Poids du joueur en kg (défaut : 75 kg)
 * @returns Calories estimées, arrondies à l'entier
 */
export function calculateCalories(
  durationSeconds: number,
  intensity: Intensity,
  weightKg: number = 75
): number {
  const durationHours = durationSeconds / 3600;
  return Math.round(MET[intensity] * weightKg * durationHours);
}
