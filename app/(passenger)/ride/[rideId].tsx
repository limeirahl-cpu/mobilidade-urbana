import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MapWebView } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { FareEstimate } from "@/components/ride/FareEstimate";
import { RatingForm } from "@/components/ride/RatingForm";
import { RideStatusBanner } from "@/components/ride/RideStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useRide } from "@/hooks/useRide";
import { fetchProfile } from "@/services/auth";
import { fetchCategoryById } from "@/services/categories";
import { addFavoriteDriver, isFavoriteDriver, removeFavoriteDriver } from "@/services/favoriteDrivers";
import { fetchMyRatingForRide, submitRating } from "@/services/ratings";
import { fetchPin } from "@/services/ridePin";
import { cancelRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { Profile, RideCategory, RideRating } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";
import { buildShareMessage } from "@/utils/shareRide";

const SNAP_POINTS = ["32%", "55%"];

export default function PassengerRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { ride, loading } = useRide(rideId ?? null);
  const driverStatus = useDriverStatus(ride?.driver_id ?? null);
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<RideRating | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    if (ride?.driver_id) {
      fetchProfile(ride.driver_id).then(setDriverProfile).catch(() => setDriverProfile(null));
    }
  }, [ride?.driver_id]);

  useEffect(() => {
    if (ride?.driver_id && session?.user) {
      isFavoriteDriver(session.user.id, ride.driver_id).then(setIsFavorite).catch(() => setIsFavorite(false));
    }
  }, [ride?.driver_id, session?.user]);

  async function handleToggleFavorite() {
    if (!ride?.driver_id || !session?.user) return;
    try {
      if (isFavorite) {
        await removeFavoriteDriver(session.user.id, ride.driver_id);
      } else {
        await addFavoriteDriver(session.user.id, ride.driver_id);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  useEffect(() => {
    if (ride?.category_id) {
      fetchCategoryById(ride.category_id).then(setCategory).catch(() => setCategory(null));
    }
  }, [ride?.category_id]);

  useEffect(() => {
    if (ride?.id) {
      fetchPin(ride.id).then(setPin).catch(() => setPin(null));
    }
  }, [ride?.id]);

  useEffect(() => {
    if (ride?.id && ride.status === "completed" && session?.user) {
      fetchMyRatingForRide(ride.id, session.user.id).then(setMyRating).catch(() => setMyRating(null));
    }
  }, [ride?.id, ride?.status, session?.user]);

  async function handleSubmitRating(stars: number, comment?: string) {
    if (!ride || !session?.user || !ride.driver_id) return;
    try {
      await submitRating(ride.id, session.user.id, ride.driver_id, stars, comment);
      setMyRating({
        ride_id: ride.id,
        rater_id: session.user.id,
        ratee_id: ride.driver_id,
        stars,
        comment: comment ?? null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      Alert.alert("Erro ao enviar avaliação", getErrorMessage(err));
    }
  }

  async function handleShare() {
    if (!ride) return;
    try {
      await Share.share({ message: buildShareMessage(ride, driverProfile, category) });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

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
          (ride.status === "accepted" ||
            ride.status === "arriving" ||
            ride.status === "in_progress" ||
            ride.status === "completed") && (
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>{driverProfile.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>
                  {driverProfile.full_name}
                  {driverProfile.rating_avg != null ? `  ★ ${driverProfile.rating_avg.toFixed(1)}` : ""}
                </Text>
                {driverProfile.vehicle_info ? (
                  <Text style={styles.driverVehicle}>{driverProfile.vehicle_info}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={handleToggleFavorite}>
                <Text style={[styles.favoriteStar, isFavorite && styles.favoriteStarActive]}>
                  {isFavorite ? "★" : "☆"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {pin && (ride.status === "accepted" || ride.status === "arriving") && (
          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>PIN de embarque</Text>
            <Text style={styles.pinValue}>{pin}</Text>
            <Text style={styles.pinHint}>Informe esse código ao motorista para iniciar a corrida</Text>
          </View>
        )}

        {ride.estimated_distance_km != null && ride.estimated_fare != null && (
          <FareEstimate distanceKm={ride.estimated_distance_km} fare={ride.estimated_fare} />
        )}
        {ride.coupon_id && ride.discount_amount != null && (
          <Text style={styles.discountLine}>Cupom aplicado: -R$ {ride.discount_amount.toFixed(2)}</Text>
        )}

        {(ride.status === "accepted" || ride.status === "arriving" || ride.status === "in_progress") && (
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareText}>Compartilhar viagem</Text>
          </TouchableOpacity>
        )}

        {(ride.status === "requested" || ride.status === "accepted" || ride.status === "arriving") && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancelar corrida</Text>
          </TouchableOpacity>
        )}

        {ride.status === "completed" &&
          (myRating ? (
            <Text style={styles.myRating}>Você avaliou: {"★".repeat(myRating.stars)}</Text>
          ) : (
            <RatingForm onSubmit={handleSubmitRating} />
          ))}

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
  pinCard: {
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: "center",
    gap: 2,
  },
  pinLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  pinValue: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, letterSpacing: 4 },
  pinHint: { fontSize: 12, color: colors.textSecondary, textAlign: "center" },
  shareButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: "center" },
  shareText: { color: colors.textPrimary, fontWeight: "700" },
  myRating: { fontSize: 15, fontWeight: "700", color: colors.brandYellowDark, textAlign: "center" },
  discountLine: { fontSize: 13, fontWeight: "700", color: colors.success },
  favoriteStar: { fontSize: 26, color: colors.border },
  favoriteStarActive: { color: colors.brandYellow },
  driverInitial: { fontSize: 18, fontWeight: "800", color: colors.black },
  driverName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  driverVehicle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cancelButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: colors.danger, fontWeight: "700" },
  doneButton: { backgroundColor: colors.black, borderRadius: 12, padding: 14, alignItems: "center" },
  doneText: { color: colors.white, fontWeight: "700" },
});
