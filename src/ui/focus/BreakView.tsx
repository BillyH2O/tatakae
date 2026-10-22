import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ActiveBreak } from '../../config/appStateKeys';
import { useDb } from '../../hooks/useDb';
import { useNow } from '../../hooks/useNow';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { en, formatClock, formatDuration } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { endBreak } from '../../services/sessionService';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { TimerRing } from '../components/TimerRing';
import { colors, panelAlpha, space, type } from '../theme/tokens';

const MS_PER_SEC = 1000;

/** Short break countdown. Not focus, no session, nothing starts automatically afterwards. */
export function BreakView({ breakState }: { breakState: ActiveBreak }) {
  const db = useDb();
  const now = useNow(250);
  const [busy, run] = useSingleFlight();

  const endsAt = breakState.startedAt + breakState.durationSec * MS_PER_SEC;
  const remainingSec = Math.max(0, Math.ceil((endsAt - now) / MS_PER_SEC));
  const over = remainingSec === 0;
  const progress = Math.min(1, Math.max(0, (now - breakState.startedAt) / (breakState.durationSec * MS_PER_SEC)));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {over ? en.focus.break.over : en.focus.break.title}
      </Text>

      <TimerRing progress={progress}>
        <Text style={styles.time} accessibilityLabel={en.focus.running.timerA11y(formatDuration(remainingSec))}>
          {formatClock(remainingSec)}
        </Text>
        <Text style={styles.sub}>{en.focus.break.subtitle}</Text>
      </TimerRing>

      {over ? (
        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.body}>{en.focus.break.overBody}</Text>
        </Panel>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={over ? en.focus.break.startSession : en.focus.break.end}
          variant={over ? 'primary' : 'ghost'}
          loading={busy}
          onPress={() => void run(() => endBreak(db, systemClock))}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xl, alignItems: 'center' },
  title: { ...type.title, color: colors.text, alignSelf: 'flex-start' },
  time: { fontSize: 56, lineHeight: 64, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  sub: { ...type.label, color: colors.textMuted },
  panel: { alignSelf: 'stretch' },
  body: { ...type.body, color: colors.textMuted },
  actions: { alignSelf: 'stretch', gap: space.md },
});
