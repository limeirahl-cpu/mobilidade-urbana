import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MapWebView } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { FareEstimate } from "@/components/ride/FareEstimate";
import { RideStatusBanner } from "@/components/ride/RideStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useRide } from "@/hooks/useRide";
import { fetchProfile } from "@/services/auth";
import { fetchCategoryById } from "@/services/categories";
import { cancelRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { Profile, RideCategory } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

const SNAP_POINTS = ["32%", "55%"];

export default function PassengerRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { ride, loading } = useRide(rideId ?? null);
  const driverStatus = useDriverStatus(ride?.driver_id ?? null);
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    if (ride?.driver_id) {
      fetchProfile(ride.driver_id).then(setDriverProfile).catch(() => setDriverProfile(null));
    }
  }, [ride?.driver_id]);

  useEffect(() => {
    if (ride?.category_id) {
      fetchCategoryById(ride.category_id).then(setCategory).catch(() => setCategory(null));
    }
  }, [ride?.category_id]);

  async function handleCancel() {
    if (!ride || !session?.user) return;
    try {
      await cancelRide(ride.id, session.user.id);
    } catch (err) {
      Alert.alert("Erro ao cancelar", getErrorMessage(err));
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
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView
          initialCenter={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
          driverLocation={driverLocation}
          selectable="none"
        />
      </View>

      <RideBottomSheet index={sheetIndex} snapPoints={SNAP_POINTS} onChangeIndex={setSheetIndex}>
        <RideStatusBanner status={ride.status} />
        {category && <Text style={styles.categoryBadge}>{category.label}</Text>}

        {driverProfile &&
          (ride.status === "accepted" || ride.status === "arriving" || ride.status === "in_progress") && (
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>{driverProfile.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{driverProfile.full_name}</Text>
                {driverProfile.vehicle_info ? (
                  <Text style={styles.driverVehicle}>{driverProfile.vehicle_info}</Text>
                ) : null}
              </View>
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
      </RideBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandYellow,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.black,
    backgroundColor: colors.brandYellow,
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  driverInitial: { fontSize: 18, fontWeight: "800", color: colors.black },
  driverName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  driverVehicle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cancelButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: colors.danger, fontWeight: "700" },
  doneButton: { backgroundColor: colors.black, borderRadius: 12, padding: 14, alignItems: "center" },
  doneText: { color: colors.white, fontWeight: "700" },
});
