import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { DbProvider } from '../db/DbProvider';
import { AppHeader } from '../ui/components/AppHeader';
import { ScreenBackground } from '../ui/components/ScreenBackground';
import { ProfileGate } from '../ui/providers/ProfileGate';
import { SessionRuntime } from '../ui/providers/SessionRuntime';
import { colors, veilForPath } from '../ui/theme/tokens';

const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' },
};

function RouteBackground() {
  return <ScreenBackground veil={veilForPath(usePathname())} />;
}

function AppShell() {
  const pathname = usePathname();
  const showHeader = pathname !== '/onboarding' && !pathname.startsWith('/onboarding/');

  return (
    <>
      {showHeader ? <AppHeader /> : null}
      <View style={styles.body}>
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.transparent }} />
      </View>
      <SessionRuntime />
    </>
  );
}

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RouteBackground />
      <ThemeProvider value={NAV_THEME}>
        <DbProvider>
          <ProfileGate>
            <AppShell />
          </ProfileGate>
        </DbProvider>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
});
