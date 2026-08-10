import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { createProfile } from "@/services/auth";
import type { UserRole } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

export default function RoleSelect() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!session?.user || !role || !fullName.trim()) return;
    setSubmitting(true);
    try {
      await createProfile({
        id: session.user.id,
        role,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        vehicleInfo: role === "driver" ? vehicleInfo.trim() || undefined : undefined,
      });
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      Alert.alert("Erro ao salvar perfil", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete seu perfil</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone (opcional)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleButton, role === "passenger" && styles.roleButtonActive]}
          onPress={() => setRole("passenger")}
        >
          <Text style={role === "passenger" ? styles.roleTextActive : styles.roleText}>Sou passageiro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === "driver" && styles.roleButtonActive]}
          onPress={() => setRole("driver")}
        >
          <Text style={role === "driver" ? styles.roleTextActive : styles.roleText}>Sou motorista</Text>
        </TouchableOpacity>
      </View>

      {role === "driver" && (
        <TextInput
          style={styles.input}
          placeholder="Veículo (ex: Onix prata, placa ABC1D23)"
          value={vehicleInfo}
          onChangeText={setVehicleInfo}
        />
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting || !role || !fullName.trim()}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  roleRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  roleButtonActive: { backgroundColor: "#111", borderColor: "#111" },
  roleText: { color: "#111", fontWeight: "600" },
  roleTextActive: { color: "#fff", fontWeight: "600" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
