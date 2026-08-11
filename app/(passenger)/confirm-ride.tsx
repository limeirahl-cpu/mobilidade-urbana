import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PaymentCheckoutModal } from "@/components/payment/PaymentCheckoutModal";
import { useAuth } from "@/contexts/AuthContext";
import { createPaymentPreference, needsRealPayment, waitForPaymentApproval } from "@/services/payments";
import { createPinForRide } from "@/services/ridePin";
import { createRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";
import { getPaymentMethodLabel } from "@/utils/paymentMethods";

export default function ConfirmRide() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    pickupLat: string;
    pickupLng: string;
    pickupLabel: string;
    dropoffLat: string;
    dropoffLng: string;
    dropoffLabel: string;
    categoryId: string;
    categoryLabel: string;
    paymentMethod: string;
    distanceKm: string;
    durationMin: string;
    couponId: string;
    discountAmount: string;
    finalFare: string;
    suggestedFare: string;
  }>();

  const [confirming, setConfirming] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [checkoutInitPoint, setCheckoutInitPoint] = useState<string | null>(null);
  const cancelWaiterRef = useRef<(() => void) | null>(null);

  const finalFare = Number(params.finalFare);
  const suggestedFare = params.suggestedFare ? Number(params.suggestedFare) : null;
  const paymentLabel = getPaymentMethodLabel(params.paymentMethod) ?? params.paymentMethod;

  function handleCheckoutReturn() {
    setCheckoutInitPoint(null);
    setStatusText("Aguardando confirmação do pagamento...");
  }

  function handleCheckoutClose() {
    setCheckoutInitPoint(null);
    cancelWaiterRef.current?.();
  }

  async function handleConfirm() {
    if (!session?.user) return;
    setConfirming(true);
    try {
      if (needsRealPayment(params.paymentMethod)) {
        setStatusText("Abrindo pagamento...");
        const { initPoint, paymentId } = await createPaymentPreference(
          finalFare,
          `Corrida Urbix — ${params.categoryLabel}`,
          params.paymentMethod
        );
        const waiter = waitForPaymentApproval(paymentId);
        cancelWaiterRef.current = waiter.cancel;
        setCheckoutInitPoint(initPoint);
        const approved = await waiter.promise;
        cancelWaiterRef.current = null;
        if (!approved) {
          Alert.alert("Pagamento não aprovado", "Tente novamente ou escolha outra forma de pagamento.");
          return;
        }
      }

      setStatusText("Confirmando corrida...");
      const ride = await createRide({
        passengerId: session.user.id,
        categoryId: params.categoryId,
        paymentMethod: params.paymentMethod,
        pickup: { lat: Number(params.pickupLat), lng: Number(params.pickupLng) },
        dropoff: { lat: Number(params.dropoffLat), lng: Number(params.dropoffLng) },
        pickupAddress: params.pickupLabel || undefined,
        dropoffAddress: params.dropoffLabel || undefined,
        distanceKm: Number(params.distanceKm),
        durationMin: Number(params.durationMin),
        fare: finalFare,
        suggestedFare: suggestedFare ?? undefined,
        couponId: params.couponId || undefined,
        discountAmount: params.discountAmount ? Number(params.discountAmount) : undefined,
      });
      await createPinForRide(ride.id);
      router.replace(`/(passenger)/ride/${ride.id}`);
    } catch (err) {
      Alert.alert("Erro ao pedir corrida", getErrorMessage(err));
    } finally {
      setConfirming(false);
      setStatusText(null);
      setCheckoutInitPoint(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Confirmar corrida</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.rowText}>{params.pickupLabel || "Ponto de embarque"}</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.rowText}>{params.dropoffLabel || "Ponto de destino"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categoria</Text>
            <Text style={styles.summaryValue}>{params.categoryLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distância</Text>
            <Text style={styles.summaryValue}>
              {Number(params.distanceKm).toFixed(1)} km · {Math.round(Number(params.durationMin))} min
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Forma de pagamento</Text>
            <Text style={styles.summaryValue}>{paymentLabel}</Text>
          </View>
          {suggestedFare != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor negociado</Text>
              <Text style={styles.summaryValue}>R$ {suggestedFare.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelFinal}>Preço final</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
  },
  back: { color: colors.textPrimary, fontWeight: "600", width: 60 },
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
