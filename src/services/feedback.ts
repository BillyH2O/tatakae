import * as Haptics from 'expo-haptics';

/**
 * Short haptic confirmation when a session ends. Best effort: unsupported platforms (web) or a
 * missing haptic engine are ignored. Not verified on a physical device in this version.
 */
export function playSessionEndHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
