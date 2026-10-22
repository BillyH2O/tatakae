import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { en } from '../../i18n/en';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const LINKS = [
  { href: '/settings/goals', label: en.settings.goals },
  { href: '/settings/categories', label: en.settings.categories },
  { href: '/settings/timer', label: en.settings.timer },
];

export default function SettingsIndexScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.settings.title}
        </Text>
        {LINKS.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => router.push(link.href as Href)}
            style={styles.link}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>{link.label}</Text>
          </Pressable>
        ))}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  panel: { gap: space.sm },
  title: { ...type.title, color: colors.text, marginBottom: space.sm },
  link: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  linkText: { ...type.body, color: colors.actionBright },
});
