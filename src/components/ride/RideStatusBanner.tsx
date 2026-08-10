import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import type { RideStatus } from "@/types/database";

const LABELS: Record<RideStatus, string> = {
  requested: "Procurando motorista...",
  accepted: "Motorista a caminho",
  arriving: "Motorista chegando",
  in_progress: "Corrida em andamento",
  completed: "Corrida concluída",
  cancelled: "Corrida cancelada",
};

const STYLE_BY_STATUS: Record<RideStatus, { bg: string; fg: string }> = {
  requested: { bg: colors.brandYellow, fg: colors.black },
  accepted: { bg: colors.black, fg: colors.white },
  arriving: { bg: colors.black, fg: colors.white },
  in_progress: { bg: colors.success, fg: colors.white },
  completed: { bg: colors.surface, fg: colors.textPrimary },
  cancelled: { bg: colors.danger, fg: colors.white },
};

export function RideStatusBanner({ status }: { status: RideStatus }) {
  const { bg, fg } = STYLE_BY_STATUS[status];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 14, borderRadius: 12 },
  text: { fontWeight: "700", fontSize: 16, textAlign: "center" },
});
