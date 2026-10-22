import { ImageBackground, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <ImageBackground
      source={require('../../assets/images/tatakae-landscape.jpg')}
      style={styles.fill}
      resizeMode="cover"
    >
      <View style={styles.center}>
        <Text style={styles.title}>Tatakae</Text>
        <Text style={styles.subtitle}>Focus et habitudes</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#050B1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,11,26,0.45)' },
  title: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#9FB3D9', fontSize: 16, marginTop: 8 },
});
