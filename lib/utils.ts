import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { XP_PER_LEVEL, LEVEL_NAMES } from './constants';

// Calcule le niveau à partir du total XP
export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  while (totalXP >= XP_PER_LEVEL(level)) {
    totalXP -= XP_PER_LEVEL(level);
    level++;
  }
  return level;
}

// Retourne le nom du rang le plus proche du niveau donné
export function getLevelName(level: number): string {
  const thresholds = Object.keys(LEVEL_NAMES)
    .map(Number)
    .sort((a, b) => b - a);
  const match = thresholds.find((t) => level >= t);
  return match ? LEVEL_NAMES[match] : 'Novice';
}

// Calcule la progression (0-1) dans le niveau actuel
export function getLevelProgress(totalXP: number): number {
  let xp = totalXP;
  let level = 1;
  while (xp >= XP_PER_LEVEL(level)) {
    xp -= XP_PER_LEVEL(level);
    level++;
  }
  return xp / XP_PER_LEVEL(level);
}

// Formate une durée en secondes → "mm:ss"
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Formate une date en français relatif (ex: "il y a 2 heures")
export function formatRelativeDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

// Formate une date courte (ex: "20 mars 2026")
export function formatShortDate(date: Date | string): string {
  return format(new Date(date), 'd MMMM yyyy', { locale: fr });
}
