import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';
import { Emblem } from './Emblem';

/** Profile photo, or the original emblem when none is set. */
export function Avatar({ uri, size }: { uri: string | null; size: number }) {
  if (!uri) return <Emblem size={size} />;
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong },
});
