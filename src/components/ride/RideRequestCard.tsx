import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fetchCategoryById } from "@/services/categories";
import { colors } from "@/theme/colors";
import type { Ride } from "@/types/database";

const PRICE_STEP = 1;

export function RideRequestCard({
  ride,
  onSubmitOffer,
  submitting,
}: {
  ride: Ride;
  onSubmitOffer: (price: number) => void;
  submitting: boolean;
}) {
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const suggested = ride.suggested_fare ?? 0;
  const [price, setPrice] = useState(suggested);

  useEffect(() => {
    fetchCategoryById(ride.category_id)
      .then((c) => setCategoryLabel(c?.label ?? null))
      .catch(() => setCategoryLabel(null));
  }, [ride.category_id]);

  // Corrida nova chegou (ou a lista rolou pra outra) — reseta o valor
  // proposto pro sugerido pelo passageiro.
  useEffect(() => {
    setPrice(ride.suggested_fare ?? 0);
  }, [ride.id, ride.suggested_fare]);

  return (
    <View style={styles.card}>
      {categoryLabel && <Text style={styles.category}>{categoryLabel}</Text>}
      <Text style={styles.label}>
        Embarque: {ride.pickup_lat.toFixed(4)}, {ride.pickup_lng.toFixed(4)}
      </Text>
      <Text style={styles.label}>
        Destino: {ride.dropoff_lat.toFixed(4)}, {ride.dropoff_lng.toFixed(4)}
      </Text>
      {ride.estimated_distance_km != null && (
        <Text style={styles.distance}>{ride.estimated_distance_km.toFixed(1)} km</Text>
      )}

      <Text style={styles.suggestedLabel}>Passageiro pediu R$ {suggested.toFixed(2)}</Text>

      <View style={styles.priceRow}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setPrice((p) => Math.max(1, Math.round((p - PRICE_STEP) * 100) / 100))}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.price}>R$ {price.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setPrice((p) => Math.round((p + PRICE_STEP) * 100) / 100)}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.acceptButton} onPress={() => onSubmitOffer(price)} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.black} /> : <Text style={styles.acceptText}>Enviar proposta</Text>}
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
  distance: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  suggestedLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginTop: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 6 },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  price: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, minWidth: 100, textAlign: "center" },
  acceptButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  acceptText: { color: colors.black, fontWeight: "800", fontSize: 16 },
});
