import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { DbProvider } from '../db/DbProvider';
import { ScreenBackground } from '../ui/components/ScreenBackground';

// Navigation containers paint their own background; make it transparent so the landscape shows through.
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' },
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#05070D' }}>
      <StatusBar style="light" />
      <ScreenBackground veil={0.45} />
      <ThemeProvider value={NAV_THEME}>
        <DbProvider>
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
        </DbProvider>
      </ThemeProvider>
    </View>
  );
}
