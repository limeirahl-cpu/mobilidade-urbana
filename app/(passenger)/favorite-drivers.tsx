import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { fetchFavoriteDrivers, removeFavoriteDriver } from "@/services/favoriteDrivers";
import { colors } from "@/theme/colors";
import type { Profile } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

export default function FavoriteDrivers() {
  const router = useRouter();
  const { session } = useAuth();
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchFavoriteDrivers(session.user.id)
      .then(setDrivers)
      .finally(() => setLoading(false));
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRemove(driverId: string) {
    if (!session?.user) return;
    try {
      await removeFavoriteDriver(session.user.id, driverId);
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
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
        <Text style={styles.title}>Motoristas favoritos</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : drivers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Nenhum motorista favoritado ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.full_name}
                  {item.rating_avg != null ? `  ★ ${item.rating_avg.toFixed(1)}` : ""}
                </Text>
                {item.vehicle_info ? <Text style={styles.vehicle}>{item.vehicle_info}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.id)}>
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
  back: { color: colors.textPrimary, fontWeight: "600", width: 60 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
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
  name: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  vehicle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  remove: { color: colors.danger, fontWeight: "700" },
});
