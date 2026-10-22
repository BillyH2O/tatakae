import * as ImagePicker from 'expo-image-picker';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { getProfile, getProfileLifetimeStats, totalXp, updateProfile } from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import { levelFromXp } from '../../domain/xp';
import { useCrystalBalance } from '../../features/crystals';
import { useQuery } from '../../hooks/useQuery';
import { useDb } from '../../hooks/useDb';
import { en, formatDuration } from '../../i18n/en';
import { copyAvatarToDocuments } from '../../services/profileService';
import { systemClock } from '../../services/clock';
import { dataEvents } from '../../services/dataEvents';
import { newId } from '../../services/ids';
import { Avatar } from '../../ui/components/Avatar';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { ProgressBar } from '../../ui/components/ProgressBar';
import { StatTile } from '../../ui/components/StatTile';
import { TabScene } from '../../ui/components/TabScene';
import { colors, panelAlpha, radius, space, type } from '../../ui/theme/tokens';

const loadProfileBundle = async (db: SqlDb) => ({
  profile: await getProfile(db),
  xp: await totalXp(db),
  stats: await getProfileLifetimeStats(db),
});

export default function ProfileScreen() {
  const db = useDb();
  const router = useRouter();
  const crystals = useCrystalBalance();
  const { data, loading } = useQuery(['profile', 'xp', 'sessions'], loadProfileBundle);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const profile = data?.profile ?? null;
  const progress = data ? levelFromXp(data.xp) : null;

  const startEditName = useCallback(() => {
    if (!profile) return;
    setNameDraft(profile.displayName);
    setEditingName(true);
  }, [profile]);

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 1 || trimmed.length > PRODUCT.profile.maxNameLength) return;
    await updateProfile(db, { displayName: trimmed }, systemClock.now());
    dataEvents.emit('profile');
    setEditingName(false);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const uri = await copyAvatarToDocuments(result.assets[0].uri, newId).catch(() => null);
    if (uri) {
      await updateProfile(db, { avatarUri: uri }, systemClock.now());
      dataEvents.emit('profile');
    }
  };

  const stats = data?.stats;

  if (loading || !profile || !progress || !stats) {
    return (
      <TabScene>
        <View style={styles.center}>
          <Text style={styles.muted}>…</Text>
        </View>
      </TabScene>
    );
  }

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel alpha={panelAlpha.profile} style={styles.panel}>
          <View style={styles.hero}>
            <Avatar uri={profile.avatarUri} size={80} />
            <Button label={en.profile.changePhoto} variant="ghost" onPress={() => void pickPhoto()} />
          </View>

          {editingName ? (
            <View style={styles.nameRow}>
              <TextInput
                style={styles.input}
                value={nameDraft}
                onChangeText={setNameDraft}
                maxLength={PRODUCT.profile.maxNameLength}
                accessibilityLabel={en.profile.editName}
              />
              <Button label={en.profile.saveName} onPress={() => void saveName()} />
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.displayName}
              </Text>
              <Button label={en.profile.editName} variant="ghost" onPress={startEditName} />
            </View>
          )}

          <Text style={styles.level}>{en.header.level(progress.level)}</Text>
          <Text style={styles.xpLabel}>{en.profile.xpProgress(progress.xpIntoLevel, progress.xpForNext)}</Text>
          <ProgressBar progress={progress.progress} />

          <View style={styles.crystals}>
            <Text style={styles.section}>{en.profile.crystals}</Text>
            <Text style={styles.crystalValue}>{crystals ?? 0}</Text>
          </View>

          <Text style={styles.section}>{en.profile.statsTitle}</Text>
          <View style={styles.statsRow}>
            <StatTile label={en.profile.totalFocus} value={formatDuration(stats.totalFocusSec)} />
            <StatTile label={en.profile.sessions} value={String(stats.sessionCount)} />
            <StatTile label={en.profile.activeDays} value={String(stats.activeDays)} />
          </View>

          <Button label={en.profile.settings} icon="cog-outline" onPress={() => router.push('/settings' as Href)} />
        </Panel>
      </ScrollView>
    </TabScene>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textMuted },
  content: { paddingHorizontal: space.md, paddingVertical: space.sm },
  panel: { gap: space.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  name: { ...type.title, color: colors.text, flex: 1 },
  input: {
    ...type.body,
    flex: 1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
  },
  level: { ...type.h2, color: colors.actionBright },
  xpLabel: { ...type.caption, color: colors.textMuted },
  crystals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crystalValue: { ...type.h2, color: colors.text, fontVariant: ['tabular-nums'] },
  section: { ...type.h2, color: colors.text, marginTop: space.sm },
  statsRow: { flexDirection: 'row', gap: space.sm },
});
