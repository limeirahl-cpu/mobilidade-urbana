import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FareEstimate } from "@/components/ride/FareEstimate";
import { MapWebView, type LatLng, type SelectableTarget } from "@/components/map/MapWebView";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import { createRide } from "@/services/rides";
import { estimateFare, haversineDistanceKm } from "@/utils/distance";

const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 }; // São Paulo

export default function PassengerHome() {
  const router = useRouter();
  const { session } = useAuth();
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [selecting, setSelecting] = useState<SelectableTarget>("pickup");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const here = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCenter(here);
      setPickup(here);
    })();
  }, []);

  function handleSelectLocation(point: LatLng) {
    if (selecting === "pickup") setPickup(point);
    else if (selecting === "dropoff") setDropoff(point);
  }

  async function handleRequestRide() {
    if (!session?.user || !pickup || !dropoff) return;
    setRequesting(true);
    try {
      const ride = await createRide(session.user.id, pickup, dropoff);
      router.push(`/(passenger)/ride/${ride.id}`);
    } catch (err) {
      Alert.alert("Erro ao pedir corrida", err instanceof Error ? err.message : String(err));
    } finally {
      setRequesting(false);
    }
  }

  const distanceKm = pickup && dropoff ? haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Para onde vamos?</Text>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.signOut}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapWebView
          initialCenter={center}
          pickup={pickup}
          dropoff={dropoff}
          selectable={selecting}
          onSelectLocation={handleSelectLocation}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, selecting === "pickup" && styles.toggleButtonActive]}
            onPress={() => setSelecting("pickup")}
          >
            <Text style={selecting === "pickup" ? styles.toggleTextActive : styles.toggleText}>
              {pickup ? "✓ " : ""}Embarque
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, selecting === "dropoff" && styles.toggleButtonActive]}
            onPress={() => setSelecting("dropoff")}
          >
            <Text style={selecting === "dropoff" ? styles.toggleTextActive : styles.toggleText}>
              {dropoff ? "✓ " : ""}Destino
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Toque no mapa para marcar o ponto selecionado acima.</Text>

        {distanceKm !== null && <FareEstimate distanceKm={distanceKm} fare={estimateFare(distanceKm)} />}

        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestRide}
          disabled={!pickup || !dropoff || requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.requestButtonText}>Pedir corrida</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
  },
  title: { fontSize: 22, fontWeight: "700" },
  signOut: { color: "#dc2626", fontWeight: "600" },
  mapContainer: { flex: 1 },
  controls: { padding: 16, gap: 10 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleButton: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, alignItems: "center" },
  toggleButtonActive: { backgroundColor: "#111", borderColor: "#111" },
  toggleText: { color: "#111", fontWeight: "600" },
  toggleTextActive: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 12, color: "#6b7280" },
  requestButton: { backgroundColor: "#111", borderRadius: 8, padding: 16, alignItems: "center" },
  requestButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
