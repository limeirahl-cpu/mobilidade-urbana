import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Ride } from "@/types/database";

export function RideRequestCard({
  ride,
  onAccept,
  accepting,
}: {
  ride: Ride;
  onAccept: () => void;
  accepting: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        Embarque: {ride.pickup_lat.toFixed(4)}, {ride.pickup_lng.toFixed(4)}
      </Text>
      <Text style={styles.label}>
        Destino: {ride.dropoff_lat.toFixed(4)}, {ride.dropoff_lng.toFixed(4)}
      </Text>
      {ride.estimated_distance_km != null && ride.estimated_fare != null && (
        <Text style={styles.fare}>
          {ride.estimated_distance_km.toFixed(1)} km · R$ {ride.estimated_fare.toFixed(2)}
        </Text>
      )}
      <TouchableOpacity style={styles.acceptButton} onPress={onAccept} disabled={accepting}>
        {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Aceitar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, backgroundColor: "#f9fafb", borderRadius: 10, gap: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  label: { fontSize: 13, color: "#374151" },
  fare: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  acceptButton: { backgroundColor: "#111", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  acceptText: { color: "#fff", fontWeight: "700" },
});
