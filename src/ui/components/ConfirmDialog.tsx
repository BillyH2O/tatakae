import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { border, colors, panel, radius, space, type } from '../theme/tokens';

interface Props {
  visible: boolean;
  title: string;
  body?: string;
  /** Extra content (choices, input) rendered between the body and the actions. */
  children?: ReactNode;
  /** Action buttons, stacked vertically. */
  actions: ReactNode;
  onRequestClose?: () => void;
}

/** Centered modal used for confirmations. Blocks the screen behind it. */
export function ConfirmDialog({ visible, title, body, children, actions, onRequestClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          {children}
          <View style={styles.actions}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,7,13,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: panel(1),
    borderWidth: border.thin,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  title: { ...type.h2, color: colors.text },
  body: { ...type.body, color: colors.textMuted },
  actions: { gap: space.sm },
});
