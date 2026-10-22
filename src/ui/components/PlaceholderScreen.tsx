import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { en } from '../../i18n/en';
import { colors, panelAlpha, space, type } from '../theme/tokens';
import { Panel } from './Panel';
import { TabScene } from './TabScene';

interface Props {
  title: string;
  body: string;
  alpha?: number;
  children?: ReactNode;
}

/** Temporary tab body until the real screen ships. Starts right under the header. */
export function PlaceholderScreen({ title, body, alpha = panelAlpha.home, children }: Props) {
  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel alpha={alpha} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          <Text style={styles.caption}>{en.placeholder.comingSoon}</Text>
          {children}
        </Panel>
      </ScrollView>
    </TabScene>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  panel: { gap: space.sm },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textFaint },
});
