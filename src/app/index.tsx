import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getSchemaVersion } from '../db/migrate';
import type { SqlDb } from '../db/SqlDb';
import { useQuery } from '../hooks/useQuery';
import { useToday } from '../hooks/useToday';
import { fr } from '../i18n/fr';

export default function Index() {
  const today = useToday();
  const fetchVersion = useCallback((db: SqlDb) => getSchemaVersion(db), []);
  const { data: version } = useQuery([], fetchVersion);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{fr.app.name}</Text>
      <Text style={styles.subtitle}>{fr.app.tagline}</Text>
      <Text style={styles.status}>
        {version === undefined ? '…' : fr.db.ready(version)} · {today}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#A3B3CF', fontSize: 16, marginTop: 8 },
  status: { color: '#6F7F9E', fontSize: 12, marginTop: 24 },
});
