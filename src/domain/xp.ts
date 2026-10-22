import { PRODUCT } from '../config/product';

interface XpConfig {
  perFullMinute: number;
  levelStepXp: number;
}

export interface LevelProgress {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP width of the current level (distance to the next threshold). */
  xpForNext: number;
  /** 0..1 progress inside the current level. */
  progress: number;
}

/** HYPOTHÈSE PRODUIT: 1 XP per full minute of focus, computed per session (not per segment). */
export function xpForFocusedSec(focusedSec: number, config: XpConfig = PRODUCT.xp): number {
  return Math.floor(Math.max(0, focusedSec) / 60) * config.perFullMinute;
}

/** Cumulative XP required to reach `level` (level 1 = 0 XP). */
export function levelThreshold(level: number, config: XpConfig = PRODUCT.xp): number {
  if (level <= 1) return 0;
  return (config.levelStepXp * (level - 1) * level) / 2;
}

export function levelFromXp(totalXp: number, config: XpConfig = PRODUCT.xp): LevelProgress {
  const xp = Math.max(0, totalXp);
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / config.levelStepXp)) / 2));
  while (levelThreshold(level + 1, config) <= xp) level += 1;
  while (level > 1 && levelThreshold(level, config) > xp) level -= 1;

  const floor = levelThreshold(level, config);
  const xpForNext = levelThreshold(level + 1, config) - floor;
  const xpIntoLevel = xp - floor;
  return { level, xpIntoLevel, xpForNext, progress: xpForNext > 0 ? xpIntoLevel / xpForNext : 0 };
}
