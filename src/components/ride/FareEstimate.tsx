import { StyleSheet, Text, View } from "react-native";

export function FareEstimate({ distanceKm, fare }: { distanceKm: number; fare: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.line}>Distância estimada: {distanceKm.toFixed(1)} km</Text>
      <Text style={styles.fare}>Tarifa estimada: R$ {fare.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: "#f3f4f6", borderRadius: 10, gap: 4 },
  line: { fontSize: 14, color: "#374151" },
  fare: { fontSize: 18, fontWeight: "700", color: "#111827" },
});
