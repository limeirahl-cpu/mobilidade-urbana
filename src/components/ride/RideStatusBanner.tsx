import { StyleSheet, Text, View } from "react-native";

import type { RideStatus } from "@/types/database";

const LABELS: Record<RideStatus, string> = {
  requested: "Procurando motorista...",
  accepted: "Motorista a caminho",
  arriving: "Motorista chegando",
  in_progress: "Corrida em andamento",
  completed: "Corrida concluída",
  cancelled: "Corrida cancelada",
};

const COLORS: Record<RideStatus, string> = {
  requested: "#f59e0b",
  accepted: "#2563eb",
  arriving: "#2563eb",
  in_progress: "#16a34a",
  completed: "#111827",
  cancelled: "#dc2626",
};

export function RideStatusBanner({ status }: { status: RideStatus }) {
  return (
    <View style={[styles.banner, { backgroundColor: COLORS[status] }]}>
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 14, borderRadius: 10 },
  text: { color: "#fff", fontWeight: "700", fontSize: 16, textAlign: "center" },
});
