import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { MapWebView, type LatLng } from "@/components/map/MapWebView";
import { Avatar } from "@/components/ui/Avatar";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { CancelReasonModal } from "@/components/ride/CancelReasonModal";
import { FareEstimate } from "@/components/ride/FareEstimate";
import { RatingForm } from "@/components/ride/RatingForm";
import { RideStatusBanner } from "@/components/ride/RideStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useRide } from "@/hooks/useRide";
import { fetchProfile } from "@/services/auth";
import { fetchCategoryById } from "@/services/categories";
import { getRoute } from "@/services/directions";
import { fetchMyRatingForRide, submitRating } from "@/services/ratings";
import { startRideWithPin } from "@/services/ridePin";
import { cancelRide, completeRide, startHeadingToPickup } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { Profile, RideCategory, RideRating } from "@/types/database";
import { getErrorMessage } from "@/utils/errors";
import { getPaymentMethodLabel } from "@/utils/paymentMethods";

const SNAP_POINTS = ["30%", "55%"];

export default function DriverRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { ride, loading } = useRide(rideId ?? null);
  const driverStatus = useDriverStatus(session?.user.id ?? null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const [passengerProfile, setPassengerProfile] = useState<Profile | null>(null);
  const [myRating, setMyRating] = useState<RideRating | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [confirmingPin, setConfirmingPin] = useState(false);
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  useEffect(() => {
    if (ride?.category_id) {
      fetchCategoryById(ride.category_id).then(setCategory).catch(() => setCategory(null));
    }
  }, [ride?.category_id]);

  // Recalcula a rota só quando o status da corrida muda (não a cada tick de
  // GPS do motorista, pra não estourar a Directions API à toa). Até
  // "arriving", desenha o caminho até o embarque; em "in_progress", até o
  // destino (partindo do embarque, onde o motorista está nesse momento).
  useEffect(() => {
    if (!ride) return;
    if (ride.status !== "accepted" && ride.status !== "arriving" && ride.status !== "in_progress") {
      setRoute(null);
      return;
    }
    const origin =
      ride.status === "in_progress"
        ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
        : driverStatus?.current_lat != null && driverStatus?.current_lng != null
          ? { lat: driverStatus.current_lat, lng: driverStatus.current_lng }
          : null;
    const destination =
      ride.status === "in_progress"
        ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng }
        : { lat: ride.pickup_lat, lng: ride.pickup_lng };
    if (!origin) return;

    let cancelled = false;
    getRoute(origin, destination).then((result) => {
      if (!cancelled) setRoute(result?.coordinates ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [ride?.status]);

  useEffect(() => {
    if (ride?.passenger_id) {
      fetchProfile(ride.passenger_id).then(setPassengerProfile).catch(() => setPassengerProfile(null));
    }
  }, [ride?.passenger_id]);

  useEffect(() => {
    if (ride?.id && ride.status === "completed" && session?.user) {
      fetchMyRatingForRide(ride.id, session.user.id).then(setMyRating).catch(() => setMyRating(null));
    }
  }, [ride?.id, ride?.status, session?.user]);

  async function handleSubmitRating(stars: number, comment?: string) {
    if (!ride || !session?.user) return;
    try {
      await submitRating(ride.id, session.user.id, ride.passenger_id, stars, comment);
      setMyRating({
        ride_id: ride.id,
        rater_id: session.user.id,
        ratee_id: ride.passenger_id,
        stars,
        comment: comment ?? null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      Alert.alert("Erro ao enviar avaliação", getErrorMessage(err));
    }
  }

  async function guard(action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  async function handleCancel(reason: string) {
    if (!ride || !session?.user) return;
    setCancelModalVisible(false);
    await guard(() => cancelRide(ride.id, session.user.id, reason));
  }

  async function handleConfirmPin() {
    if (!ride || pinInput.length !== 4) return;
    setConfirmingPin(true);
    try {
      const ok = await startRideWithPin(ride.id, pinInput);
      if (!ok) {
        Alert.alert("PIN incorreto", "Peça para o passageiro confirmar o código e tente de novo.");
      }
      setPinInput("");
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    } finally {
      setConfirmingPin(false);
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
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng, gender: passengerProfile?.gender }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
          driverLocation={
            driverStatus?.current_lat != null && driverStatus?.current_lng != null
              ? {
                  lat: driverStatus.current_lat,
                  lng: driverStatus.current_lng,
                  vehicleType: category?.key === "moto" ? "moto" : "car",
                }
              : null
          }
          route={route}
          selectable="none"
        />
      </View>

      <RideBottomSheet index={sheetIndex} snapPoints={SNAP_POINTS} onChangeIndex={setSheetIndex}>
        <RideStatusBanner status={ride.status} />
        <View style={styles.badgeRow}>
          {category && <Text style={styles.categoryBadge}>{category.label}</Text>}
          {getPaymentMethodLabel(ride.payment_method) && (
            <Text style={styles.paymentBadge}>{getPaymentMethodLabel(ride.payment_method)}</Text>
          )}
        </View>

        {passengerProfile && (
          <View style={styles.passengerCard}>
            <Avatar uri={passengerProfile.avatar_url} label={passengerProfile.full_name} size={40} />
            <Text style={styles.passengerName}>
              {passengerProfile.full_name}
              {passengerProfile.rating_avg != null ? `  ★ ${passengerProfile.rating_avg.toFixed(1)}` : ""}
            </Text>
          </View>
        )}

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
          <View style={styles.pinSection}>
            <Text style={styles.pinLabel}>Peça o PIN de 4 dígitos ao passageiro</Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.primaryButton, pinInput.length !== 4 && styles.primaryButtonDisabled]}
              onPress={handleConfirmPin}
              disabled={pinInput.length !== 4 || confirmingPin}
            >
              {confirmingPin ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.primaryText}>Confirmar e iniciar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {ride.status === "in_progress" && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => guard(() => completeRide(ride.id))}>
            <Text style={styles.primaryText}>Concluir corrida</Text>
          </TouchableOpacity>
        )}

        {(ride.status === "accepted" || ride.status === "arriving") && session?.user && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => setCancelModalVisible(true)}>
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
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace("/(driver)/home")}>
            <Text style={styles.doneText}>Voltar ao início</Text>
          </TouchableOpacity>
        )}
      </RideBottomSheet>

      <CancelReasonModal
        visible={cancelModalVisible}
        onConfirm={handleCancel}
        onDismiss={() => setCancelModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  badgeRow: { flexDirection: "row", gap: 8 },
  categoryBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.black,
    backgroundColor: colors.brandGreen,
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paymentBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  passengerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  passengerName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  myRating: { fontSize: 15, fontWeight: "700", color: colors.brandGreenDark, textAlign: "center" },
  pinSection: { gap: 10 },
  pinLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
  },
  primaryButton: { backgroundColor: colors.brandGreen, borderRadius: 12, padding: 16, alignItems: "center" },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryText: { color: colors.black, fontWeight: "800", fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: colors.danger, fontWeight: "700" },
  doneButton: { backgroundColor: colors.black, borderRadius: 12, padding: 14, alignItems: "center" },
  doneText: { color: colors.white, fontWeight: "700" },
});
