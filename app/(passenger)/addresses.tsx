import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { deleteSavedAddress, fetchSavedAddresses } from "@/services/addresses";
import { colors } from "@/theme/colors";
import type { SavedAddress } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

export default function SavedAddresses() {
  const router = useRouter();
  const { session } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchSavedAddresses(session.user.id)
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete(id: string) {
    try {
      await deleteSavedAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
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
        <Text style={styles.title}>Meus endereços</Text>
        <TouchableOpacity onPress={() => router.push("/(passenger)/add-address")}>
          <Text style={styles.add}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Nenhum endereço salvo ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.coords}>{item.address_text ?? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.remove}>Remover</Text>
              </TouchableOpacity>
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
  label: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  coords: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  remove: { color: colors.danger, fontWeight: "700" },
});
