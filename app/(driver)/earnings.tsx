import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { fetchDriverEarningsSummary, type EarningsSummary } from "@/services/earnings";
import { colors } from "@/theme/colors";

export default function DriverEarnings() {
  const router = useRouter();
  const { session } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchDriverEarningsSummary(session.user.id)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [session?.user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ganhos</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading || !summary ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Hoje</Text>
            <Text style={styles.cardValue}>R$ {summary.todayGross.toFixed(2)}</Text>
            <Text style={styles.cardRides}>
              {summary.todayRides} {summary.todayRides === 1 ? "corrida" : "corridas"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Últimos 7 dias</Text>
            <Text style={styles.cardValue}>R$ {summary.weekGross.toFixed(2)}</Text>
            <Text style={styles.cardRides}>
              {summary.weekRides} {summary.weekRides === 1 ? "corrida" : "corridas"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Últimos 30 dias</Text>
            <Text style={styles.cardValue}>R$ {summary.monthGross.toFixed(2)}</Text>
            <Text style={styles.cardRides}>
              {summary.monthRides} {summary.monthRides === 1 ? "corrida" : "corridas"}
            </Text>
          </View>
        </View>
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
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 4 },
  cardLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  cardValue: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  cardRides: { fontSize: 12, color: colors.textSecondary },
});
