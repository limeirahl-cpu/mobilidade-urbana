import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

export function FareEstimate({ distanceKm, fare }: { distanceKm: number; fare: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.line}>Distância estimada: {distanceKm.toFixed(1)} km</Text>
      <Text style={styles.fare}>R$ {fare.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, backgroundColor: colors.surface, borderRadius: 12, gap: 4 },
  line: { fontSize: 13, color: colors.textSecondary },
  fare: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
});
