import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PaymentCheckoutModal } from "@/components/payment/PaymentCheckoutModal";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCategoryById } from "@/services/categories";
import { createPaymentPreference, needsRealPayment, waitForPaymentApproval } from "@/services/payments";
import { createPinForRide } from "@/services/ridePin";
import { cancelRide, fetchRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { Ride, RideCategory } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";
import { getPaymentMethodLabel } from "@/utils/paymentMethods";

export default function ConfirmRide() {
  const router = useRouter();
  const { session } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [checkoutInitPoint, setCheckoutInitPoint] = useState<string | null>(null);
  const cancelWaiterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!rideId) return;
    fetchRide(rideId)
      .then((r) => {
        setRide(r);
        if (r) fetchCategoryById(r.category_id).then(setCategory).catch(() => setCategory(null));
      })
      .finally(() => setLoading(false));
  }, [rideId]);

  function handleCheckoutReturn() {
    setCheckoutInitPoint(null);
    setStatusText("Aguardando confirmação do pagamento...");
  }

  function handleCheckoutClose() {
    setCheckoutInitPoint(null);
    cancelWaiterRef.current?.();
  }

  async function handleConfirm() {
    if (!ride || !session?.user) return;
    setConfirming(true);
    try {
      const method = ride.payment_method;
      if (method && needsRealPayment(method)) {
        setStatusText("Abrindo pagamento...");
        const { initPoint, paymentId } = await createPaymentPreference(
          ride.estimated_fare ?? 0,
          `Corrida Urbix — ${category?.label ?? ""}`,
          method,
          ride.id
        );
        const waiter = waitForPaymentApproval(paymentId);
        cancelWaiterRef.current = waiter.cancel;
        setCheckoutInitPoint(initPoint);
        const approved = await waiter.promise;
        cancelWaiterRef.current = null;
        if (!approved) {
          await cancelRide(ride.id, session.user.id, "Pagamento não aprovado").catch(() => {});
          Alert.alert("Pagamento não aprovado", "A corrida foi cancelada. Você pode tentar pedir de novo.");
          router.replace("/(passenger)/home");
          return;
        }
      }

      setStatusText("Confirmando corrida...");
      await createPinForRide(ride.id);
      router.replace(`/(passenger)/ride/${ride.id}`);
    } catch (err) {
      Alert.alert("Erro ao confirmar corrida", getErrorMessage(err));
    } finally {
      setConfirming(false);
      setStatusText(null);
      setCheckoutInitPoint(null);
    }
  }

  if (loading || !ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const finalFare = ride.estimated_fare ?? 0;
  const paymentLabel = getPaymentMethodLabel(ride.payment_method) ?? ride.payment_method;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirmar corrida</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.rowText}>{ride.pickup_address || "Ponto de embarque"}</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.rowText}>{ride.dropoff_address || "Ponto de destino"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categoria</Text>
            <Text style={styles.summaryValue}>{category?.label ?? "—"}</Text>
          </View>
          {ride.estimated_distance_km != null && ride.estimated_duration_min != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distância</Text>
              <Text style={styles.summaryValue}>
                {ride.estimated_distance_km.toFixed(1)} km · {Math.round(ride.estimated_duration_min)} min
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Forma de pagamento</Text>
            <Text style={styles.summaryValue}>{paymentLabel}</Text>
          </View>
          {ride.suggested_fare != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor pedido</Text>
              <Text style={styles.summaryValue}>R$ {ride.suggested_fare.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelFinal}>Preço acordado</Text>
            <Text style={styles.summaryValueFinal}>R$ {finalFare.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={confirming}>
          {confirming ? (
            <View style={styles.confirmingRow}>
              <ActivityIndicator color={colors.white} />
              {statusText && <Text style={styles.confirmButtonText}>{statusText}</Text>}
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>Confirmar corrida</Text>
          )}
        </TouchableOpacity>
      </View>

      <PaymentCheckoutModal
        visible={checkoutInitPoint != null}
        initPoint={checkoutInitPoint}
        onReturn={handleCheckoutReturn}
        onRequestClose={handleCheckoutClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  header: {
    padding: 16,
    paddingTop: 56,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  summaryLabelFinal: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  summaryValueFinal: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  confirmButton: { backgroundColor: colors.brandOrange, borderRadius: 12, padding: 16, alignItems: "center" },
  confirmingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
