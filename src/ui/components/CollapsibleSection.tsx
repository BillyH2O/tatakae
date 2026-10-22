import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '../theme/tokens';

interface Props {
  title: string;
  count: number;
  children: ReactNode;
}

export function CollapsibleSection({ title, count, children }: Props) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{count}</Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  title: { ...type.label, color: colors.textMuted },
  count: { ...type.caption, color: colors.textFaint },
  body: { gap: space.sm },
});
