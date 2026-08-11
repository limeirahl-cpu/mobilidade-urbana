import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { submitForVerification, uploadDriverDocument, type DriverDocumentKind } from "@/services/driverDocuments";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const DOCUMENT_ITEMS: { kind: DriverDocumentKind; label: string }[] = [
  { kind: "cnh", label: "Foto da CNH" },
  { kind: "vehicle_document", label: "Documento do veículo (CRLV)" },
  { kind: "vehicle_photo", label: "Foto do veículo" },
];

export default function DriverDocuments() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [uploaded, setUploaded] = useState<Record<DriverDocumentKind, boolean>>({
    cnh: !!profile?.cnh_photo_url,
    vehicle_document: !!profile?.vehicle_document_url,
    vehicle_photo: !!profile?.vehicle_photo_url,
  });
  const [uploadingKind, setUploadingKind] = useState<DriverDocumentKind | null>(null);
  const [plate, setPlate] = useState(profile?.vehicle_plate ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handlePick(kind: DriverDocumentKind) {
    if (!session?.user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Precisamos acessar suas fotos pra enviar o documento.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    setUploadingKind(kind);
    try {
      await uploadDriverDocument(session.user.id, kind, result.assets[0].uri);
      setUploaded((prev) => ({ ...prev, [kind]: true }));
    } catch (err) {
      Alert.alert("Erro ao enviar", getErrorMessage(err));
    } finally {
      setUploadingKind(null);
    }
  }

  const allUploaded = DOCUMENT_ITEMS.every((item) => uploaded[item.kind]);
  const canSubmit = allUploaded && plate.trim().length >= 7;

  async function handleSubmit() {
    if (!session?.user || !canSubmit) return;
    setSubmitting(true);
    try {
      await submitForVerification(session.user.id, plate.trim().toUpperCase());
      await refreshProfile();
      Alert.alert("Enviado", "Seus documentos foram enviados. A aprovação é manual e pode levar um tempo.");
      router.back();
    } catch (err) {
      Alert.alert("Erro ao enviar", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabel =
    profile?.verification_status === "approved"
      ? "Aprovado ✓"
      : profile?.verification_status === "rejected"
        ? "Rejeitado — reenvie os documentos"
        : "Em análise";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Verificação</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.status}>Status: {statusLabel}</Text>

        {DOCUMENT_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.kind}
            style={[styles.docButton, uploaded[item.kind] && styles.docButtonDone]}
            onPress={() => handlePick(item.kind)}
            disabled={uploadingKind != null}
          >
            {uploadingKind === item.kind ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.docButtonText}>
                {uploaded[item.kind] ? "✓ " : ""}
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Placa do veículo</Text>
        <TextInput
          style={styles.plateInput}
          value={plate}
          onChangeText={(t) => setPlate(t.toUpperCase())}
          placeholder="ABC1D23"
          autoCapitalize="characters"
          maxLength={8}
        />

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.submitText}>Enviar pra análise</Text>
          )}
        </TouchableOpacity>
      </View>
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
  status: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 },
  docButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  docButtonDone: { borderColor: colors.brandGreen, backgroundColor: colors.surface },
  docButtonText: { fontWeight: "700", color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: 8 },
  plateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  submitButton: { backgroundColor: colors.brandGreen, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: colors.black, fontWeight: "800", fontSize: 16 },
});
