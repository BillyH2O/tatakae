import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { DbProvider } from '../db/DbProvider';
import { AppHeader } from '../ui/components/AppHeader';
import { ScreenBackground } from '../ui/components/ScreenBackground';
import { colors, veilForPath } from '../ui/theme/tokens';

// Navigation containers paint their own background; make it transparent so the landscape shows through.
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' },
};

/** Reads the route on its own so navigation never re-renders the database provider. */
function RouteBackground() {
  return <ScreenBackground veil={veilForPath(usePathname())} />;
}

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RouteBackground />
      <ThemeProvider value={NAV_THEME}>
        <DbProvider>
          <AppHeader />
          <View style={styles.body}>
            <Stack screenOptions={{ headerShown: false, contentStyle: styles.transparent }} />
          </View>
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
