import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { panel, veil as veils } from '../theme/tokens';

const LANDSCAPE = require('../../../assets/images/landscape.jpg');

/** The shared anime landscape, behind every screen, darkened by `veil` (0..1). */
export function ScreenBackground({ veil = veils.fallback }: { veil?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={LANDSCAPE} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: panel(veil) }]} />
    </View>
  );
}
