import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';

import { getSchemaVersion } from '../../db/migrate';
import type { SqlDb } from '../../db/SqlDb';
import { useQuery } from '../../hooks/useQuery';
import { en } from '../../i18n/en';
import { PlaceholderScreen } from '../../ui/components/PlaceholderScreen';
import { colors, type } from '../../ui/theme/tokens';

export default function HomeScreen() {
  const fetchVersion = useCallback((db: SqlDb) => getSchemaVersion(db), []);
  const { data: version } = useQuery([], fetchVersion);

  return (
    <PlaceholderScreen title={en.tabs.home} body={en.placeholder.home}>
      <Text style={styles.status}>{version === undefined ? '…' : en.db.ready(version)}</Text>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  status: { ...type.caption, color: colors.textFaint },
});
