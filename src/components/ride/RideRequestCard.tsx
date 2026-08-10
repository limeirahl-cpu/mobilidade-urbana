import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fetchCategoryById } from "@/services/categories";
import { colors } from "@/theme/colors";
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
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryById(ride.category_id)
      .then((c) => setCategoryLabel(c?.label ?? null))
      .catch(() => setCategoryLabel(null));
  }, [ride.category_id]);

  return (
    <View style={styles.card}>
      {categoryLabel && <Text style={styles.category}>{categoryLabel}</Text>}
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
        {accepting ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={styles.acceptText}>Aceitar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: colors.surface, borderRadius: 12, gap: 4 },
  category: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.black,
    backgroundColor: colors.brandGreen,
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  label: { fontSize: 13, color: colors.textSecondary },
  fare: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 4 },
  acceptButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  acceptText: { color: colors.black, fontWeight: "800", fontSize: 16 },
});
