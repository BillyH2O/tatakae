import { PRODUCT } from '../config/product';

export interface HabitStyle {
  /** Hex color from `PRODUCT.habits.colorPalette`. */
  color: string;
  /** MaterialCommunityIcons key from `PRODUCT.habits.iconChoices`. */
  icon: string;
}

const COLORS: readonly string[] = PRODUCT.habits.colorPalette;
const ICONS: readonly string[] = PRODUCT.habits.iconChoices;

export const isHabitColor = (value: string): boolean => COLORS.includes(value);
export const isHabitIcon = (value: string): boolean => ICONS.includes(value);

/** A color / icon outside the offered choices falls back to the default look (never an invalid value). */
export function resolveHabitStyle(input: { color?: string | null; icon?: string | null }): HabitStyle {
  return {
    color: input.color && isHabitColor(input.color) ? input.color : PRODUCT.habits.defaultColor,
    icon: input.icon && isHabitIcon(input.icon) ? input.icon : PRODUCT.habits.defaultIcon,
  };
}

/** Trimmed name, or null when empty or longer than the allowed length. */
export function normalizeHabitTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed.length <= PRODUCT.habits.maxTitleLength ? trimmed : null;
}
