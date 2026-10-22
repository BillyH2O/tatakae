import { StyleSheet } from 'react-native';

/** Visual tokens of the blue RPG theme (ARCHITECTURE.md §10.1). Not product rules. */
export const colors = {
  bg: '#05070D',
  night: '#0A1224',
  nightRaised: '#0F1A33',
  border: 'rgba(120,160,255,0.18)',
  borderStrong: 'rgba(76,155,255,0.55)',
  divider: 'rgba(160,180,220,0.10)',
  action: '#2F7BFF',
  actionBright: '#4C9BFF',
  actionPressed: '#1F5FD6',
  actionMuted: 'rgba(47,123,255,0.16)',
  text: '#F4F7FF',
  textMuted: '#A3B3CF',
  textFaint: '#6F7F9E',
  crystal: '#7FD8FF',
  score: { low: '#D9895E', mid: '#E2B144', good: '#8BDB9A', full: '#2FB86A', neutral: '#7B8AA8' },
  danger: '#FF7A7A',
  warning: '#F2C14E',
  category: ['#4C9BFF', '#7C6CFF', '#38C6D9', '#E2B144', '#E57AA8', '#8BDB9A', '#F28C5B', '#A3B3CF'],
} as const;

/** Panel fill over the landscape: Home/Profile 0.90, Quests 0.96, Stats charts 1. */
export const panelAlpha = { home: 0.9, profile: 0.9, quests: 0.96, solid: 1 } as const;

export function panel(alpha: number): string {
  return `rgba(10,18,36,${alpha})`;
}

/** Veil darkening the shared landscape, per screen. */
export const veil = { home: 0.35, profile: 0.35, quests: 0.45, stats: 0.5, focus: 0.65, fallback: 0.45 } as const;

export function veilForPath(pathname: string): number {
  if (pathname === '/' || pathname === '') return veil.home;
  if (pathname.startsWith('/profile')) return veil.profile;
  if (pathname.startsWith('/quests')) return veil.quests;
  if (pathname.startsWith('/stats')) return veil.stats;
  if (pathname.startsWith('/focus')) return veil.focus;
  return veil.fallback;
}

export const radius = { sm: 4, md: 6, lg: 8 } as const;
export const border = { hairline: StyleSheet.hairlineWidth, thin: 1 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const touch = { min: 44 } as const;

/** Upper bound for font scaling inside the compact header, so it stays ~80–95 pt tall. */
export const headerMaxFontScale = 1.3;

export const type = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h2: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;
