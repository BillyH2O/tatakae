import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const LANDSCAPE = require('../../../assets/images/landscape.jpg');

/** The shared anime landscape, behind every screen, darkened by `veil` (0..1). */
export function ScreenBackground({ veil = 0.4 }: { veil?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={LANDSCAPE} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(10,18,36,${veil})` }]} />
    </View>
  );
}
