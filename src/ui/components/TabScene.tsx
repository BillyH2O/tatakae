import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Root of every tab screen. Scenes are transparent (shared landscape); without native screens
 * (web), unfocused tabs are only pushed below with zIndex and would show through, so hide them.
 */
export function TabScene({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return <View style={[styles.root, !focused && styles.hidden]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hidden: { display: 'none' },
});
