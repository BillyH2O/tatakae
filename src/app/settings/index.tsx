import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { en } from '../../i18n/en';
import type { IconName } from '../../ui/components/Button';
import { ListGroup, ListRow } from '../../ui/components/ListRow';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const LINKS: readonly { href: string; label: string; icon: IconName }[] = [
  { href: '/settings/goals', label: en.settings.goals, icon: 'target' },
  { href: '/settings/categories', label: en.settings.categories, icon: 'shape-outline' },
  { href: '/settings/timer', label: en.settings.timer, icon: 'timer-outline' },
  { href: '/settings/notifications', label: en.settings.notifications, icon: 'bell-outline' },
  { href: '/settings/data', label: en.settings.data, icon: 'database-outline' },
];

export default function SettingsIndexScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.settings.title}
        </Text>
        <ListGroup>
          {LINKS.map((link, index) => (
            <ListRow
              key={link.href}
              label={link.label}
              icon={link.icon}
              separated={index > 0}
              onPress={() => router.push(link.href as Href)}
            />
          ))}
        </ListGroup>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm },
  panel: { gap: space.lg },
  title: { ...type.title, color: colors.text },
});
