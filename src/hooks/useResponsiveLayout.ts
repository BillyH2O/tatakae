import { useWindowDimensions } from 'react-native';

// Layout breakpoints (presentation only, not product rules).
const NARROW_WIDTH = 420;
const LARGE_FONT_SCALE = 1.2;
const TEXT_LIST_FONT_SCALE = 1.3;

/** Radar and category blocks are stacked on narrow screens or with large text instead of squeezed side by side. */
export function stackedLayout(width: number, fontScale: number): boolean {
  return width < NARROW_WIDTH || fontScale > LARGE_FONT_SCALE;
}

export function useResponsiveLayout() {
  const { width, fontScale } = useWindowDimensions();
  return {
    width,
    fontScale,
    stacked: stackedLayout(width, fontScale),
    largeText: fontScale > TEXT_LIST_FONT_SCALE,
  };
}
