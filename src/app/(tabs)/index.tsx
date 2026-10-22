import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';

import { getSchemaVersion } from '../../db/migrate';
import type { SqlDb } from '../../db/SqlDb';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useQuery } from '../../hooks/useQuery';
import { en } from '../../i18n/en';
import { Button } from '../../ui/components/Button';
import { PlaceholderScreen } from '../../ui/components/PlaceholderScreen';
import { colors, type } from '../../ui/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const fetchVersion = useCallback((db: SqlDb) => getSchemaVersion(db), []);
  const { data: version } = useQuery([], fetchVersion);
  const active = useActiveSession().data;

  return (
    <PlaceholderScreen title={en.tabs.home} body={en.placeholder.home}>
      <Button
        label={active ? en.home.resumeSession : en.home.startSession}
        onPress={() => router.push('/focus' as Href)}
        disabled={active === undefined}
      />
      <Text style={styles.status}>{version === undefined ? '…' : en.db.ready(version)}</Text>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  status: { ...type.caption, color: colors.textFaint },
});
