import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { createProfile } from "@/services/auth";
import { fetchActiveCategories } from "@/services/categories";
import { colors } from "@/theme/colors";
import type { Gender, RideCategory, UserRole } from "@/types/database";
import { formatE164BRForDisplay } from "@/utils/phone";
import { getErrorMessage } from "@/utils/errors";

export default function RoleSelect() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const { session, refreshProfile } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleSubmit() {
    if (!session?.user || !role || !fullName.trim() || !termsAccepted) return;
    if (role === "driver" && !categoryId) return;
    if (role === "passenger" && !gender) return;
    setSubmitting(true);
    try {
      await createProfile({
        id: session.user.id,
        role,
        fullName: fullName.trim(),
        phone: phone || undefined,
        vehicleInfo: role === "driver" ? vehicleInfo.trim() || undefined : undefined,
        categoryId: role === "driver" ? categoryId ?? undefined : undefined,
        gender: role === "passenger" ? gender ?? undefined : undefined,
        termsAccepted,
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
      {phone && (
        <View style={styles.phoneRow}>
          <Text style={styles.phoneText}>{formatE164BRForDisplay(phone)}</Text>
          <Text style={styles.phoneVerifiedBadge}>✓ Verificado</Text>
        </View>
      )}

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

      <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          Li e aceito os{" "}
          <Text style={styles.termsLink} onPress={() => router.push("/(auth)/terms")}>
            Termos de Uso e a Política de Privacidade
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={
          submitting ||
          !role ||
          !fullName.trim() ||
          !termsAccepted ||
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
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  phoneText: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  phoneVerifiedBadge: { fontSize: 12, fontWeight: "700", color: colors.success },
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
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  checkboxMark: { color: colors.black, fontWeight: "800", fontSize: 14 },
  termsText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  termsLink: { color: colors.info, fontWeight: "700" },
});
