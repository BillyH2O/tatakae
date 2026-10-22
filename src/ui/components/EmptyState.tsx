import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '../theme/tokens';
import { Button } from './Button';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, paddingVertical: space.xl, alignItems: 'stretch' },
  message: { ...type.body, color: colors.textMuted, textAlign: 'center' },
});
