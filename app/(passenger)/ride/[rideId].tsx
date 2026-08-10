import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MapWebView } from "@/components/map/MapWebView";
import { FareEstimate } from "@/components/ride/FareEstimate";
import { RideStatusBanner } from "@/components/ride/RideStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useRide } from "@/hooks/useRide";
import { fetchProfile } from "@/services/auth";
import { cancelRide } from "@/services/rides";
import type { Profile } from "@/types/database";

export default function PassengerRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { ride, loading } = useRide(rideId ?? null);
  const driverStatus = useDriverStatus(ride?.driver_id ?? null);
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (ride?.driver_id) {
      fetchProfile(ride.driver_id).then(setDriverProfile).catch(() => setDriverProfile(null));
    }
  }, [ride?.driver_id]);

  async function handleCancel() {
    if (!ride || !session?.user) return;
    try {
      await cancelRide(ride.id, session.user.id);
    } catch (err) {
      Alert.alert("Erro ao cancelar", err instanceof Error ? err.message : String(err));
    }
  }

  if (loading || !ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const driverLocation =
    driverStatus?.current_lat != null && driverStatus?.current_lng != null
      ? { lat: driverStatus.current_lat, lng: driverStatus.current_lng }
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWebView
          initialCenter={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
          driverLocation={driverLocation}
          selectable="none"
        />
      </View>

      <View style={styles.panel}>
        <RideStatusBanner status={ride.status} />

        {driverProfile && (ride.status === "accepted" || ride.status === "arriving" || ride.status === "in_progress") && (
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverProfile.full_name}</Text>
            {driverProfile.vehicle_info ? <Text style={styles.driverVehicle}>{driverProfile.vehicle_info}</Text> : null}
          </View>
        )}

        {ride.estimated_distance_km != null && ride.estimated_fare != null && (
          <FareEstimate distanceKm={ride.estimated_distance_km} fare={ride.estimated_fare} />
        )}

        {(ride.status === "requested" || ride.status === "accepted" || ride.status === "arriving") && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancelar corrida</Text>
          </TouchableOpacity>
        )}

        {(ride.status === "completed" || ride.status === "cancelled") && (
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace("/(passenger)/home")}>
            <Text style={styles.doneText}>Voltar ao início</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapContainer: { flex: 1 },
  panel: { padding: 16, gap: 12 },
  driverInfo: { padding: 12, backgroundColor: "#eff6ff", borderRadius: 10 },
  driverName: { fontSize: 16, fontWeight: "700" },
  driverVehicle: { fontSize: 14, color: "#374151", marginTop: 2 },
  cancelButton: { borderWidth: 1, borderColor: "#dc2626", borderRadius: 8, padding: 14, alignItems: "center" },
  cancelText: { color: "#dc2626", fontWeight: "700" },
  doneButton: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
  doneText: { color: "#fff", fontWeight: "700" },
});
