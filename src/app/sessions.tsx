import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../config/product';
import { useSessionHistory } from '../hooks/useStats';
import { en } from '../i18n/en';
import { Button } from '../ui/components/Button';
import { Panel } from '../ui/components/Panel';
import { SessionRow } from '../ui/components/SessionRow';
import { colors, panelAlpha, space, type } from '../ui/theme/tokens';

/** Finished sessions, newest first. Tapping one opens its correction screen. */
export default function SessionHistoryScreen() {
  const router = useRouter();
  const [limit, setLimit] = useState<number>(PRODUCT.stats.historyPageSize);
  const history = useSessionHistory(limit);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.stats.history.title}
        </Text>
        {history === undefined ? (
          <Text style={styles.caption}>{en.stats.loading}</Text>
        ) : history.items.length === 0 ? (
          <Text style={styles.body}>{en.stats.history.empty}</Text>
        ) : (
          history.items.map((item, index) => (
            <View key={item.id} style={index > 0 ? styles.divided : undefined}>
              <SessionRow item={item} onPress={() => router.push({ pathname: '/session/[id]/edit', params: { id: item.id } })} />
            </View>
          ))
        )}
        {history?.hasMore ? (
          <Button
            label={en.stats.history.loadMore}
            variant="ghost"
            onPress={() => setLimit((current) => current + PRODUCT.stats.historyPageSize)}
          />
        ) : null}
      </Panel>
      <Button label={en.stats.add} onPress={() => router.push('/session/new')} />
      <Button label={en.common.back} variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.lg },
  panel: { gap: space.sm },
  title: { ...type.title, color: colors.text, marginBottom: space.xs },
  caption: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.textMuted },
  divided: { borderTopWidth: 1, borderTopColor: colors.divider },
});
