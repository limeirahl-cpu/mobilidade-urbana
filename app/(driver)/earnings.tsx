import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { fetchDriverEarningsSummary, type EarningsPeriod, type EarningsSummary } from "@/services/earnings";
import { colors } from "@/theme/colors";

function PeriodCard({ title, period }: { title: string; period: EarningsPeriod }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={styles.cardValue}>R$ {period.gross.toFixed(2)}</Text>
      <Text style={styles.cardRides}>
        {period.rides} {period.rides === 1 ? "corrida" : "corridas"}
      </Text>
      {period.receivable > 0 && (
        <Text style={styles.receivable}>A receber (Pix/cartão): R$ {period.receivable.toFixed(2)}</Text>
      )}
      {period.owed > 0 && <Text style={styles.owed}>Comissão devida (dinheiro): R$ {period.owed.toFixed(2)}</Text>}
    </View>
  );
}

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
          <Text style={styles.hint}>
            "A receber" é o que a plataforma te deve (corridas pagas por Pix/cartão). "Comissão devida" é o que você
            deve à plataforma sobre corridas em dinheiro, já que ficou com o valor na hora. Ainda é só um registro —
            transferência automática fica pra uma fase futura.
          </Text>
          <PeriodCard title="Hoje" period={summary.today} />
          <PeriodCard title="Últimos 7 dias" period={summary.week} />
          <PeriodCard title="Últimos 30 dias" period={summary.month} />
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
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 4 },
  cardLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  cardValue: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  cardRides: { fontSize: 12, color: colors.textSecondary },
  receivable: { fontSize: 13, fontWeight: "700", color: colors.success, marginTop: 4 },
  owed: { fontSize: 13, fontWeight: "700", color: colors.danger, marginTop: 2 },
});
