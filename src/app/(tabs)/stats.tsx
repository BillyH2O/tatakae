import { useLocalSearchParams } from 'expo-router';

import { en } from '../../i18n/en';
import { PlaceholderScreen } from '../../ui/components/PlaceholderScreen';
import { panelAlpha } from '../../ui/theme/tokens';

export default function StatsScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  const label = period === 'month' ? en.stats.period.month : en.stats.period.week;
  return <PlaceholderScreen title={en.tabs.stats} body={en.placeholder.stats(label)} alpha={panelAlpha.solid} />;
}
