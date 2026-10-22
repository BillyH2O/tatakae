import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { DuplicateNameError } from '../../db/errors';
import {
  archiveCategory,
  createCategory,
  listCategories,
  reorderCategories,
  restoreCategory,
  updateCategory,
} from '../../db/repositories';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { en } from '../../i18n/en';
import { dataEvents } from '../../services/dataEvents';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

export default function SettingsCategoriesScreen() {
  const db = useDb();
  const { data: categories, loading } = useQuery(['categories'], (d) =>
    listCategories(d, { includeArchived: true }),
  );
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = categories?.filter((c) => c.archivedAt === null) ?? [];
  const archived = categories?.filter((c) => c.archivedAt !== null) ?? [];

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const icon = PRODUCT.categories.iconChoices[0]!;
      const color = PRODUCT.categories.colorPalette[0]!;
      await createCategory(db, { id: newId(), name, icon, color }, systemClock.now());
      dataEvents.emit('categories');
      setNewName('');
    } catch (e) {
      setError(e instanceof DuplicateNameError ? en.settings.duplicateName : String(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, direction: -1 | 1) => {
    const ids = active.map((c) => c.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    await reorderCategories(db, next, systemClock.now());
    dataEvents.emit('categories');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title}>{en.settings.categoriesTitle}</Text>
        <Text style={styles.note}>{en.settings.uncategorizedNote}</Text>

        {active.map((category) => (
          <View key={category.id} style={styles.row}>
            <MaterialCommunityIcons name={category.icon as never} size={22} color={category.color} />
            <CategoryNameEditor categoryId={category.id} initialName={category.name} />
            <View style={styles.rowActions}>
              <Button label="↑" variant="ghost" onPress={() => void move(category.id, -1)} />
              <Button label="↓" variant="ghost" onPress={() => void move(category.id, 1)} />
              <Button
                label={en.settings.archive}
                variant="ghost"
                onPress={async () => {
                  await archiveCategory(db, category.id, systemClock.now());
                  dataEvents.emit('categories');
                }}
              />
            </View>
          </View>
        ))}

        {archived.length > 0 ? (
          <>
            <Text style={styles.section}>{en.settings.archived}</Text>
            {archived.map((category) => (
              <View key={category.id} style={styles.row}>
                <Text style={styles.archivedName}>{category.name}</Text>
                <Button
                  label={en.settings.restore}
                  variant="ghost"
                  onPress={async () => {
                    await restoreCategory(db, category.id, systemClock.now());
                    dataEvents.emit('categories');
                  }}
                />
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>{en.settings.addCategory}</Text>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder={en.settings.nameLabel}
          placeholderTextColor={colors.textFaint}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={en.settings.addCategory} onPress={() => void addCategory()} loading={busy} />
      </Panel>
    </ScrollView>
  );
}

function CategoryNameEditor({ categoryId, initialName }: { categoryId: string; initialName: string }) {
  const db = useDb();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const commit = async () => {
    if (name.trim() === initialName) return;
    try {
      await updateCategory(db, categoryId, { name: name.trim() }, systemClock.now());
      dataEvents.emit('categories');
      setError(null);
    } catch (e) {
      setError(e instanceof DuplicateNameError ? en.settings.duplicateName : String(e));
    }
  };

  return (
    <View style={styles.nameEdit}>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        onBlur={() => void commit()}
        accessibilityLabel={en.settings.nameLabel}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textMuted },
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, paddingBottom: space.xl * 2 },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  note: { ...type.caption, color: colors.textFaint },
  section: { ...type.h2, color: colors.text, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  nameEdit: { flex: 1, minWidth: 120 },
  nameInput: {
    ...type.body,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: space.xs,
    minHeight: 40,
  },
  archivedName: { ...type.body, color: colors.textMuted, flex: 1 },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
  },
  error: { ...type.caption, color: colors.danger },
});
