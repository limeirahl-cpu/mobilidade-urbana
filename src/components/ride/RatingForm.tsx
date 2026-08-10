import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { colors } from "@/theme/colors";

export function RatingForm({ onSubmit }: { onSubmit: (stars: number, comment?: string) => Promise<void> }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (stars === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(stars, comment.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como foi a corrida?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity key={value} onPress={() => setStars(value)}>
            <Text style={[styles.star, value <= stars && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Comentário (opcional)"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity
        style={[styles.button, stars === 0 && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={stars === 0 || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={styles.buttonText}>Enviar avaliação</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  starsRow: { flexDirection: "row", gap: 8 },
  star: { fontSize: 32, color: colors.border },
  starFilled: { color: colors.brandGreen },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
  },
  button: { backgroundColor: colors.brandGreen, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.black, fontWeight: "800" },
});
