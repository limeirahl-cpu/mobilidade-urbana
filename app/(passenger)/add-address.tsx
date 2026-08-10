import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { MapWebView, type LatLng } from "@/components/map/MapWebView";
import { useAuth } from "@/contexts/AuthContext";
import { createSavedAddress } from "@/services/addresses";
import { reverseGeocode } from "@/services/geocoding";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const LABEL_PRESETS = ["Casa", "Trabalho"];

export default function AddAddress() {
  const router = useRouter();
  const { session } = useAuth();
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [label, setLabel] = useState("");
  const [resolvedAddressText, setResolvedAddressText] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!point) {
      setResolvedAddressText(null);
      return;
    }
    setResolvingAddress(true);
    reverseGeocode(point)
      .then(setResolvedAddressText)
      .finally(() => setResolvingAddress(false));
  }, [point]);

  async function handleSave() {
    if (!session?.user || !point || !label.trim()) return;
    setSaving(true);
    try {
      await createSavedAddress(session.user.id, label.trim(), point.lat, point.lng, resolvedAddressText ?? undefined);
      router.back();
    } catch (err) {
      Alert.alert("Erro ao salvar", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWebView initialCenter={center} dropoff={point} selectable="dropoff" onSelectLocation={setPoint} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.hint}>
          {point ? "Ponto marcado. Dê um nome pra esse endereço." : "Toque no mapa para marcar o local."}
        </Text>
        {point && (
          <Text style={styles.resolvedAddress}>
            {resolvingAddress ? "Resolvendo endereço..." : resolvedAddressText ?? "Endereço não encontrado"}
          </Text>
        )}
        <View style={styles.presetRow}>
          {LABEL_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetChip, label === preset && styles.presetChipActive]}
              onPress={() => setLabel(preset)}
            >
              <Text style={label === preset ? styles.presetTextActive : styles.presetText}>{preset}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Ex: Casa, Trabalho, Academia" value={label} onChangeText={setLabel} />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (!point || !label.trim()) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!point || !label.trim() || saving}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  panel: { padding: 16, gap: 12 },
  hint: { fontSize: 13, color: colors.textSecondary },
  resolvedAddress: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  presetRow: { flexDirection: "row", gap: 8 },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  presetChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  presetText: { color: colors.black, fontWeight: "600" },
  presetTextActive: { color: colors.black, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 },
  buttonRow: { flexDirection: "row", gap: 12 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: "center" },
  cancelText: { color: colors.textPrimary, fontWeight: "700" },
  saveButton: { flex: 1, backgroundColor: colors.brandOrange, borderRadius: 10, padding: 14, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontWeight: "700" },
});
