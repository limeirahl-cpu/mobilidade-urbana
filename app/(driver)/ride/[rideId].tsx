import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MapWebView } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { FareEstimate } from "@/components/ride/FareEstimate";
import { RideStatusBanner } from "@/components/ride/RideStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useRide } from "@/hooks/useRide";
import { fetchCategoryById } from "@/services/categories";
import { cancelRide, completeRide, startHeadingToPickup, startRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { RideCategory } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";

const SNAP_POINTS = ["30%", "50%"];

export default function DriverRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { ride, loading } = useRide(rideId ?? null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    if (ride?.category_id) {
      fetchCategoryById(ride.category_id).then(setCategory).catch(() => setCategory(null));
    }
  }, [ride?.category_id]);

  async function guard(action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  if (loading || !ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView
          initialCenter={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
          selectable="none"
        />
      </View>

      <RideBottomSheet index={sheetIndex} snapPoints={SNAP_POINTS} onChangeIndex={setSheetIndex}>
        <RideStatusBanner status={ride.status} />
        {category && <Text style={styles.categoryBadge}>{category.label}</Text>}

        {ride.estimated_distance_km != null && ride.estimated_fare != null && (
          <FareEstimate distanceKm={ride.estimated_distance_km} fare={ride.estimated_fare} />
        )}

        {ride.status === "accepted" && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => guard(() => startHeadingToPickup(ride.id))}
          >
            <Text style={styles.primaryText}>Seguir para o embarque</Text>
          </TouchableOpacity>
        )}

        {ride.status === "arriving" && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => guard(() => startRide(ride.id))}>
            <Text style={styles.primaryText}>Iniciar corrida</Text>
          </TouchableOpacity>
        )}

        {ride.status === "in_progress" && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => guard(() => completeRide(ride.id))}>
            <Text style={styles.primaryText}>Concluir corrida</Text>
          </TouchableOpacity>
        )}

        {(ride.status === "accepted" || ride.status === "arriving") && session?.user && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => guard(() => cancelRide(ride.id, session.user.id))}
          >
            <Text style={styles.cancelText}>Cancelar corrida</Text>
          </TouchableOpacity>
        )}

        {(ride.status === "completed" || ride.status === "cancelled") && (
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace("/(driver)/home")}>
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
  primaryButton: { backgroundColor: colors.brandYellow, borderRadius: 12, padding: 16, alignItems: "center" },
  primaryText: { color: colors.black, fontWeight: "800", fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: colors.danger, fontWeight: "700" },
  doneButton: { backgroundColor: colors.black, borderRadius: 12, padding: 14, alignItems: "center" },
  doneText: { color: colors.white, fontWeight: "700" },
});
