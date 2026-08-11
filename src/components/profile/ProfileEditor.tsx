import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/services/auth";
import { uploadAvatar } from "@/services/avatar";
import { fetchActiveCategories } from "@/services/categories";
import { colors } from "@/theme/colors";
import type { Gender, RideCategory } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";
import { formatE164BRForDisplay } from "@/utils/phone";

export function ProfileEditor() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [categoryId, setCategoryId] = useState(profile?.category_id ?? null);
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.role === "driver") {
      fetchActiveCategories()
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [profile?.role]);

  async function handlePickAvatar() {
    if (!session?.user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Precisamos acessar suas fotos para trocar o avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(session.user.id, result.assets[0].uri);
      await updateProfile(session.user.id, { avatarUrl: url });
      await refreshProfile();
    } catch (err) {
      Alert.alert("Erro ao trocar foto", getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!session?.user || !fullName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(session.user.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        ...(categoryId ? { categoryId } : {}),
        ...(gender ? { gender } : {}),
      });
      await refreshProfile();
      Alert.alert("Pronto", "Perfil atualizado.");
    } catch (err) {
      Alert.alert("Erro ao salvar", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar}>
        <Avatar uri={profile.avatar_url} label={profile.full_name} size={88} />
        {uploadingAvatar && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
        <Text style={styles.avatarHint}>Toque para trocar a foto</Text>
      </TouchableOpacity>

      {profile.rating_avg != null && (
        <Text style={styles.rating}>
          ★ {profile.rating_avg.toFixed(1)} ({profile.rating_count} avaliações)
        </Text>
      )}

      <TextInput style={styles.input} placeholder="Nome completo" value={fullName} onChangeText={setFullName} />

      {profile.phone && (
        <View style={styles.phoneRow}>
          <Text style={styles.phoneText}>{formatE164BRForDisplay(profile.phone)}</Text>
          {profile.phone_verified && <Text style={styles.phoneVerifiedBadge}>✓ Verificado</Text>}
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="E-mail (opcional)"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {profile.role === "passenger" && (
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

      {profile.role === "driver" && categories.length > 0 && (
        <>
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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving || !fullName.trim()}>
        {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Salvar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  avatarWrapper: { alignItems: "center", gap: 6 },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 12, color: colors.textSecondary },
  rating: { textAlign: "center", fontWeight: "700", color: colors.textPrimary },
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
  sectionLabel: { fontSize: 13, color: colors.textSecondary },
  categoryRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  categoryChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
  categoryChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  categoryText: { color: colors.black, fontWeight: "600" },
  categoryTextActive: { color: colors.black, fontWeight: "700" },
  saveButton: { backgroundColor: colors.brandOrange, borderRadius: 8, padding: 14, alignItems: "center" },
  saveText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
