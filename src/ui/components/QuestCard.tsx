import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, radius, space, type } from '../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  /** Opens the quest (icon and text area only, so `right` can hold its own buttons). */
  onPress?: () => void;
  /** Right column (start button, duration…). */
  right?: ReactNode;
  /** Replaces the document icon (a habit shows its own badge). */
  leading?: ReactNode;
}

/** A quest shown on its own: document icon, title and category, as on the mission and focus mockups. */
export function QuestCard({ title, subtitle, onPress, right, leading }: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {leading ?? <MaterialCommunityIcons name="file-document-outline" size={34} color={colors.actionBright} />}
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: border.thin,
    borderColor: colors.border,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
  },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  pressed: { opacity: 0.7 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...type.h2, fontWeight: '700', color: colors.text },
  subtitle: { ...type.label, fontWeight: '400', color: colors.actionBright },
});
