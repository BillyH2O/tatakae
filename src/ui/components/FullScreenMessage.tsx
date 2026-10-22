import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      <ScreenBackground veil={0.6} />
      <ScrollView contentContainerStyle={styles.content}>
        {busy ? <ActivityIndicator color="#4C9BFF" size="large" /> : null}
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
  root: { flex: 1, backgroundColor: '#05070D' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: '#F4F7FF', fontSize: 20, fontWeight: '700' },
  body: { color: '#A3B3CF', fontSize: 15, lineHeight: 20 },
  detail: { color: '#6F7F9E', fontSize: 12, fontFamily: 'monospace' },
});
