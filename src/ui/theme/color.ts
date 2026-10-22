/** `#RRGGBB` + opacity (0..1) → `rgba(...)`. Anything that is not a 6-digit hex is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return hex;
  const [, r, g, b] = match;
  return `rgba(${parseInt(r as string, 16)},${parseInt(g as string, 16)},${parseInt(b as string, 16)},${alpha})`;
}
