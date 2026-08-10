import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fetchCategoryById } from "@/services/categories";
import { colors } from "@/theme/colors";
import type { Ride } from "@/types/database";
import { getPaymentMethodLabel } from "@/utils/paymentMethods";

const STATUS_LABEL: Record<string, string> = {
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  cancelled: colors.danger,
};

export function RideHistoryCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryById(ride.category_id)
      .then((c) => setCategoryLabel(c?.label ?? null))
      .catch(() => setCategoryLabel(null));
  }, [ride.category_id]);

  const date = new Date(ride.requested_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.date}>{date}</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[ride.status] ?? colors.textSecondary }]}>
          {STATUS_LABEL[ride.status] ?? ride.status}
        </Text>
      </View>
      {categoryLabel && <Text style={styles.category}>{categoryLabel}</Text>}
      <Text style={styles.label}>
        {ride.pickup_lat.toFixed(4)}, {ride.pickup_lng.toFixed(4)} → {ride.dropoff_lat.toFixed(4)},{" "}
        {ride.dropoff_lng.toFixed(4)}
      </Text>
      {ride.estimated_fare != null && <Text style={styles.fare}>R$ {ride.estimated_fare.toFixed(2)}</Text>}
      {ride.coupon_id && ride.discount_amount != null && (
        <Text style={styles.discount}>Cupom: -R$ {ride.discount_amount.toFixed(2)}</Text>
      )}
      {getPaymentMethodLabel(ride.payment_method) && (
        <Text style={styles.payment}>{getPaymentMethodLabel(ride.payment_method)}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, backgroundColor: colors.surface, borderRadius: 12, gap: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 13, color: colors.textSecondary },
  status: { fontSize: 12, fontWeight: "700" },
  category: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  label: { fontSize: 13, color: colors.textPrimary },
  fare: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, marginTop: 2 },
  discount: { fontSize: 12, fontWeight: "700", color: colors.success },
  payment: { fontSize: 12, color: colors.textSecondary },
});
