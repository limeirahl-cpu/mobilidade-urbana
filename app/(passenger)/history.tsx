import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RideHistoryCard } from "@/components/ride/RideHistoryCard";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRideHistory } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { Ride } from "@/types/database";

export default function PassengerHistory() {
  const router = useRouter();
  const { session } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchRideHistory("passenger", session.user.id)
      .then(setRides)
      .finally(() => setLoading(false));
  }, [session?.user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Histórico</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : rides.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Nenhuma corrida ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RideHistoryCard ride={item} onPress={() => router.push(`/(passenger)/ride/${item.id}`)} />
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
});
