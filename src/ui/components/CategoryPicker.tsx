import { StyleSheet, View } from 'react-native';

import type { Category } from '../../domain/types';
import { en } from '../../i18n/en';
import { space } from '../theme/tokens';
import { Chip } from './Chip';

interface Props {
  categories: readonly Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

/**
 * Category choice as wrapped chips ("None" first). Archived categories are not offered, except the
 * one already selected, so correcting an old session never silently drops its category.
 */
export function CategoryPicker({ categories, value, onChange }: Props) {
  const visible = categories.filter((category) => category.archivedAt === null || category.id === value);
  return (
    <View style={styles.row}>
      <Chip label={en.stats.form.noCategory} selected={value === null} onPress={() => onChange(null)} />
      {visible.map((category) => (
        <Chip
          key={category.id}
          label={category.archivedAt === null ? category.name : `${category.name} (${en.stats.history.archived})`}
          selected={value === category.id}
          onPress={() => onChange(category.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
