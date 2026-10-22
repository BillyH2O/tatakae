import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { asLocalDate, toLocalDate } from '../domain/time/localDate';
import { useCategoryBars } from '../hooks/useHome';
import { en, formatDayLong } from '../i18n/en';
import { systemClock } from '../services/clock';
import { Button } from '../ui/components/Button';
import { CategoryBars } from '../ui/components/CategoryBars';
import { Panel } from '../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../ui/theme/tokens';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** Every category of one day (the Home block only shows the top ones). */
export default function CategoriesScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const day = asLocalDate(date && DATE_PARAM.test(date) ? date : toLocalDate(systemClock.now()));
  const bars = useCategoryBars(day);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.home} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.home.categories.fullTitle}
        </Text>
        <Text style={styles.caption}>{formatDayLong(day)}</Text>
        {bars === undefined ? (
          <Text style={styles.caption}>…</Text>
        ) : bars.length === 0 ? (
          <Text style={styles.body}>{en.home.categories.empty}</Text>
        ) : (
          <CategoryBars bars={bars} />
        )}
      </Panel>
      <Button label={en.common.back} variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.textMuted },
});
