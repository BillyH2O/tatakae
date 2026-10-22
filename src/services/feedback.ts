import * as Haptics from 'expo-haptics';

/**
 * Short haptic confirmation when a session ends. Best effort: unsupported platforms (web) or a
 * missing haptic engine are ignored. Not verified on a physical device in this version.
 */
export function playSessionEndHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Light tick when a quest is checked. Same best-effort rules as above. */
export function playCheckHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
