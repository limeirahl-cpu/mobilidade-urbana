import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { createProfile } from "@/services/auth";
import { fetchActiveCategories } from "@/services/categories";
import { colors } from "@/theme/colors";
import type { Gender, RideCategory, UserRole } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

export default function RoleSelect() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleSubmit() {
    if (!session?.user || !role || !fullName.trim()) return;
    if (role === "driver" && !categoryId) return;
    if (role === "passenger" && !gender) return;
    setSubmitting(true);
    try {
      await createProfile({
        id: session.user.id,
        role,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        vehicleInfo: role === "driver" ? vehicleInfo.trim() || undefined : undefined,
        categoryId: role === "driver" ? categoryId ?? undefined : undefined,
        gender: role === "passenger" ? gender ?? undefined : undefined,
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

      {role === "passenger" && (
        <>
          <Text style={styles.sectionLabel}>Gênero</Text>
          <View style={styles.categoryRow}>
            <TouchableOpacity
              style={[styles.categoryChip, gender === "male" && styles.categoryChipActive]}
              onPress={() => setGender("male")}
            >
              <Text style={gender === "male" ? styles.categoryTextActive : styles.categoryText}>Masculino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryChip, gender === "female" && styles.categoryChipActive]}
              onPress={() => setGender("female")}
            >
              <Text style={gender === "female" ? styles.categoryTextActive : styles.categoryText}>Feminino</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {role === "driver" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Veículo (ex: Onix prata, placa ABC1D23)"
            value={vehicleInfo}
            onChangeText={setVehicleInfo}
          />

          <Text style={styles.sectionLabel}>Categoria do veículo</Text>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, categoryId === category.id && styles.categoryChipActive]}
                onPress={() => setCategoryId(category.id)}
              >
                <Text style={categoryId === category.id ? styles.categoryTextActive : styles.categoryText}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={
          submitting ||
          !role ||
          !fullName.trim() ||
          (role === "driver" && !categoryId) ||
          (role === "passenger" && !gender)
        }
      >
        {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continuar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 },
  roleRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  roleButtonActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  roleText: { color: colors.black, fontWeight: "600" },
  roleTextActive: { color: colors.black, fontWeight: "600" },
  sectionLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  categoryRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  categoryChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  categoryText: { color: colors.black, fontWeight: "600" },
  categoryTextActive: { color: colors.black, fontWeight: "700" },
  button: { backgroundColor: colors.brandOrange, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
