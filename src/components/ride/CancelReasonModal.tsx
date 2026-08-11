import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/theme/colors";

const REASONS = ["Passageiro não apareceu", "Endereço errado", "Trânsito/atraso", "Outro"];

interface CancelReasonModalProps {
  visible: boolean;
  onConfirm: (reason: string) => void;
  onDismiss: () => void;
}

export function CancelReasonModal({ visible, onConfirm, onDismiss }: CancelReasonModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    setSelected(null);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Por que você está cancelando?</Text>
          <View style={styles.chips}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.chip, selected === reason && styles.chipSelected]}
                onPress={() => setSelected(reason)}
              >
                <Text style={[styles.chipText, selected === reason && styles.chipTextSelected]}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.confirmButton, !selected && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={styles.confirmText}>Confirmar cancelamento</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.dismiss}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
  title: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  chipTextSelected: { color: colors.white },
  confirmButton: { backgroundColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmText: { color: colors.white, fontWeight: "800" },
  dismiss: { textAlign: "center", color: colors.textSecondary, fontWeight: "600", paddingVertical: 4 },
});
