import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { colors } from "@/theme/colors";
import { getNegotiationRange, isWithinNegotiationRange, simulateDriverResponse } from "@/utils/priceNegotiation";

type Step = "idle" | "waiting" | "countered" | "rejected";

export default function NegotiatePrice() {
  const router = useRouter();
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
    estimatedFare: string;
    couponId: string;
    discountAmount: string;
  }>();

  const estimatedFare = Number(params.estimatedFare);
  const range = getNegotiationRange(estimatedFare);

  const [step, setStep] = useState<Step>("idle");
  const [customValue, setCustomValue] = useState("");
  const [counterFare, setCounterFare] = useState<number | null>(null);
  const [proposedFare, setProposedFare] = useState<number | null>(null);

  const parsedValue = Number(customValue.replace(",", "."));
  const isValueValid = customValue.trim().length > 0 && !Number.isNaN(parsedValue) && isWithinNegotiationRange(parsedValue, estimatedFare);

  function navigateToConfirm(fare: number, suggestedFare?: number) {
    router.push({
      pathname: "/(passenger)/confirm-ride",
      params: {
        ...params,
        finalFare: String(fare),
        suggestedFare: suggestedFare != null ? String(suggestedFare) : "",
      },
    });
  }

  function handleAcceptEstimated() {
    navigateToConfirm(estimatedFare);
  }

  async function handleSendProposal() {
    if (!isValueValid) return;
    setProposedFare(parsedValue);
    setStep("waiting");
    const outcome = await simulateDriverResponse(parsedValue, estimatedFare);
    if (outcome.result === "accepted") {
      navigateToConfirm(parsedValue, parsedValue);
    } else if (outcome.result === "countered") {
      setCounterFare(outcome.counterFare);
      setStep("countered");
    } else {
      setStep("rejected");
    }
  }

  function handleAcceptCounter() {
    if (counterFare == null || proposedFare == null) return;
    navigateToConfirm(counterFare, proposedFare);
  }

  function handleTryAgain() {
    setStep("idle");
    setCounterFare(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Negociar preço</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryLabel}>{params.categoryLabel}</Text>
        <Text style={styles.estimatedFare}>R$ {estimatedFare.toFixed(2)}</Text>
        <Text style={styles.hint}>Preço estimado pra essa corrida</Text>

        {step === "idle" && (
          <>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptEstimated}>
              <Text style={styles.acceptButtonText}>Aceitar preço estimado</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Ou sugira outro valor</Text>
            <Text style={styles.rangeHint}>
              Entre R$ {range.min.toFixed(2)} e R$ {range.max.toFixed(2)}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              keyboardType="decimal-pad"
              value={customValue}
              onChangeText={setCustomValue}
            />
            <TouchableOpacity
              style={[styles.proposeButton, !isValueValid && styles.proposeButtonDisabled]}
              onPress={handleSendProposal}
              disabled={!isValueValid}
            >
              <Text style={styles.proposeButtonText}>Enviar proposta</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "waiting" && (
          <View style={styles.waitingBox}>
            <ActivityIndicator color={colors.brandOrange} />
            <Text style={styles.waitingText}>Aguardando resposta do motorista...</Text>
          </View>
        )}

        {step === "countered" && counterFare != null && (
          <View style={styles.responseBox}>
            <Text style={styles.responseTitle}>O motorista fez uma contraproposta</Text>
            <Text style={styles.counterFare}>R$ {counterFare.toFixed(2)}</Text>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptCounter}>
              <Text style={styles.acceptButtonText}>Aceitar contraproposta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleTryAgain}>
              <Text style={styles.secondaryButtonText}>Tentar outro valor</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "rejected" && (
          <View style={styles.responseBox}>
            <Text style={styles.responseTitle}>Sua proposta não foi aceita</Text>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptEstimated}>
              <Text style={styles.acceptButtonText}>Aceitar preço estimado</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleTryAgain}>
              <Text style={styles.secondaryButtonText}>Tentar outro valor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  content: { padding: 16, gap: 10, alignItems: "center" },
  categoryLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  estimatedFare: { fontSize: 36, fontWeight: "800", color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  acceptButton: { backgroundColor: colors.brandOrange, borderRadius: 10, padding: 14, alignItems: "center", width: "100%" },
  acceptButtonText: { color: colors.white, fontWeight: "700" },
  sectionLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 20, alignSelf: "flex-start" },
  rangeHint: { fontSize: 12, color: colors.textSecondary, alignSelf: "flex-start" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: "100%",
    marginTop: 6,
  },
  proposeButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  proposeButtonDisabled: { opacity: 0.5 },
  proposeButtonText: { color: colors.black, fontWeight: "700" },
  waitingBox: { alignItems: "center", gap: 10, marginTop: 24 },
  waitingText: { color: colors.textSecondary, fontWeight: "600" },
  responseBox: { alignItems: "center", gap: 10, width: "100%", marginTop: 16 },
  responseTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  counterFare: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, marginBottom: 6 },
  secondaryButton: { padding: 10 },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: "600" },
});
