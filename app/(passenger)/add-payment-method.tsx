import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { createSavedPaymentMethod, fetchSavedPaymentMethods, setDefaultPaymentMethod } from "@/services/savedPaymentMethods";
import { colors } from "@/theme/colors";
import type { CardPaymentData, PixPaymentData } from "@/types/database";
import {
  cardBrandLabel,
  detectCardBrand,
  formatCardNumberInput,
  formatExpiryInput,
  luhnCheck,
  validateCVV,
  validateExpiry,
} from "@/utils/cardValidation";
import { getErrorMessage } from "@/utils/errors";

// MOCK/MVP: nenhum dado de cartão é processado ou cobrado de verdade — só
// salvamos um registro (últimos 4 dígitos, bandeira, validade, titular) pra
// exibir na carteira do usuário. O número completo e o CVV nunca saem do
// estado local deste formulário: são validados aqui e descartados.
// TODO: antes de produção, integrar um gateway real (Stripe, Mercado Pago,
// PagSeguro etc.) pra tokenizar o cartão em vez de guardar qualquer coisa
// diretamente no banco.

type MethodType = "cartao" | "pix";

export default function AddPaymentMethod() {
  const router = useRouter();
  const { session } = useAuth();
  const [type, setType] = useState<MethodType>("cartao");
  const [submitting, setSubmitting] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");

  const [pixKey, setPixKey] = useState("");

  const cardDigits = cardNumber.replace(/\D/g, "");
  const brand = detectCardBrand(cardDigits);
  const [expMonth, expYear] = expiry.split("/");

  const isCardValid =
    luhnCheck(cardDigits) &&
    validateExpiry(expMonth ?? "", expYear ?? "") &&
    validateCVV(cvv, brand) &&
    holderName.trim().length > 0;

  const isPixValid = pixKey.trim().length > 0;

  async function handleSave() {
    if (!session?.user) return;
    setSubmitting(true);
    try {
      const existing = await fetchSavedPaymentMethods(session.user.id);
      const isFirst = existing.length === 0;

      const data: CardPaymentData | PixPaymentData =
        type === "cartao"
          ? {
              last4: cardDigits.slice(-4),
              brand: cardBrandLabel(brand),
              expiryMonth: Number(expMonth),
              expiryYear: Number(expYear),
              holderName: holderName.trim(),
            }
          : { key: pixKey.trim() };

      const created = await createSavedPaymentMethod(session.user.id, type, data);
      if (isFirst) {
        await setDefaultPaymentMethod(created.id);
      }
      router.back();
    } catch (err) {
      Alert.alert("Erro ao salvar", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = type === "cartao" ? isCardValid : isPixValid;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adicionar método</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeChip, type === "cartao" && styles.typeChipActive]}
            onPress={() => setType("cartao")}
          >
            <Text style={type === "cartao" ? styles.typeTextActive : styles.typeText}>Cartão</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, type === "pix" && styles.typeChipActive]}
            onPress={() => setType("pix")}
          >
            <Text style={type === "pix" ? styles.typeTextActive : styles.typeText}>Pix</Text>
          </TouchableOpacity>
        </View>

        {type === "cartao" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Número do cartão"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={(t) => setCardNumber(formatCardNumberInput(t))}
              maxLength={19}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="MM/AA"
                keyboardType="number-pad"
                value={expiry}
                onChangeText={(t) => setExpiry(formatExpiryInput(t))}
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="CVV"
                keyboardType="number-pad"
                secureTextEntry
                value={cvv}
                onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nome no cartão"
              autoCapitalize="characters"
              value={holderName}
              onChangeText={setHolderName}
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Chave Pix (CPF, e-mail, telefone ou aleatória)"
            autoCapitalize="none"
            value={pixKey}
            onChangeText={setPixKey}
          />
        )}

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || submitting}
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Salvar</Text>}
        </TouchableOpacity>
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
  content: { padding: 16, gap: 12 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  typeText: { color: colors.black, fontWeight: "600" },
  typeTextActive: { color: colors.black, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: "row", gap: 12 },
  rowInput: { flex: 1 },
  saveButton: { backgroundColor: colors.brandOrange, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontWeight: "700" },
});
