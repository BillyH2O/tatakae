import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, space, type, veil } from '../theme/tokens';
import { ScreenBackground } from './ScreenBackground';

interface Props {
  title: string;
  body?: string;
  detail?: string;
  busy?: boolean;
}

export function FullScreenMessage({ title, body, detail, busy }: Props) {
  return (
    <View style={styles.root}>
      <ScreenBackground veil={veil.focus} />
      <ScrollView contentContainerStyle={styles.content}>
        {busy ? <ActivityIndicator color={colors.actionBright} size="large" /> : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.md },
  title: { ...type.title, fontSize: 20, color: colors.text },
  body: { ...type.body, color: colors.textMuted },
  detail: { ...type.caption, color: colors.textFaint, fontFamily: 'monospace' },
});
