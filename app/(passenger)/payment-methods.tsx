import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { deleteSavedPaymentMethod, fetchSavedPaymentMethods, setDefaultPaymentMethod } from "@/services/savedPaymentMethods";
import { colors } from "@/theme/colors";
import type { CardPaymentData, PixPaymentData, SavedPaymentMethod } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

function methodLabel(method: SavedPaymentMethod): string {
  if (method.type === "cartao") {
    const data = method.data as CardPaymentData;
    return `${data.brand} •••• ${data.last4}`;
  }
  const data = method.data as PixPaymentData;
  return `Pix — ${data.key}`;
}

export default function PaymentMethods() {
  const router = useRouter();
  const { session } = useAuth();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchSavedPaymentMethods(session.user.id)
      .then(setMethods)
      .finally(() => setLoading(false));
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSetDefault(id: string) {
    try {
      await setDefaultPaymentMethod(id);
      load();
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSavedPaymentMethod(id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      Alert.alert("Erro ao remover", getErrorMessage(err));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Métodos de pagamento</Text>
        <TouchableOpacity onPress={() => router.push("/(passenger)/add-payment-method")}>
          <Text style={styles.add}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : methods.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Nenhum método salvo ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.label}>{methodLabel(item)}</Text>
                  {item.is_default && <Text style={styles.defaultBadge}>Padrão</Text>}
                </View>
                {item.type === "cartao" && (
                  <Text style={styles.subLabel}>
                    Válido até {String((item.data as CardPaymentData).expiryMonth).padStart(2, "0")}/
                    {(item.data as CardPaymentData).expiryYear}
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                {!item.is_default && (
                  <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
                    <Text style={styles.actionText}>Definir padrão</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.remove}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
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
  back: { color: colors.textPrimary, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  add: { color: colors.textPrimary, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.textSecondary },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  subLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  defaultBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.black,
    backgroundColor: colors.brandGreen,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actions: { alignItems: "flex-end", gap: 6 },
  actionText: { color: colors.info, fontWeight: "700", fontSize: 12 },
  remove: { color: colors.danger, fontWeight: "700", fontSize: 12 },
});
