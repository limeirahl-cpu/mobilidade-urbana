import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { MapWebView, type LatLng } from "@/components/map/MapWebView";
import { DriverSideMenu } from "@/components/driver/DriverSideMenu";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { RideRequestCard } from "@/components/ride/RideRequestCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useIncomingRideRequests } from "@/hooks/useIncomingRideRequests";
import { signOut } from "@/services/auth";
import { setOnline } from "@/services/driverStatus";
import { fetchDriverEarningsSummary } from "@/services/earnings";
import { registerAndSavePushToken } from "@/services/pushNotifications";
import { createRideOffer, listenForOfferStatus } from "@/services/rideOffers";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const SNAP_POINTS = ["22%", "45%"];

export default function DriverHome() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const driverId = session?.user.id ?? null;
  const status = useDriverStatus(driverId);
  const isOnline = status?.is_online ?? false;
  useDriverLocation(driverId, isOnline);
  const requests = useIncomingRideRequests(isOnline, profile?.category_id ?? null);
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [submittedOfferId, setSubmittedOfferId] = useState<string | null>(null);
  const [submittedForRideId, setSubmittedForRideId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [todayGross, setTodayGross] = useState(0);

  useEffect(() => {
    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // Contador do dia no mapa — busca de novo sempre que o motorista muda de
  // status online/offline (cobre o caso comum de abrir o app já ligado, e
  // de refletir a corrida mais recente ao voltar pra home depois dela).
  useEffect(() => {
    if (!driverId) return;
    fetchDriverEarningsSummary(driverId)
      .then((summary) => setTodayGross(summary.today.gross))
      .catch(() => {});
  }, [driverId, isOnline]);

  async function toggleOnline(value: boolean) {
    if (!driverId) return;
    if (value && profile?.verification_status !== "approved") {
      Alert.alert(
        "Verificação pendente",
        profile?.verification_status === "rejected"
          ? "Seus documentos foram rejeitados. Reenvie pra poder ficar online."
          : "Envie seus documentos e aguarde a aprovação antes de ficar online.",
        [
          { text: "Enviar documentos", onPress: () => router.push("/(driver)/documents") },
          { text: "Cancelar", style: "cancel" },
        ]
      );
      return;
    }
    try {
      await setOnline(value);
      if (value) {
        registerAndSavePushToken(driverId).catch(() => {});
      }
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  async function handleSubmitOffer(rideId: string, price: number) {
    if (!driverId) return;
    setSubmittingOffer(true);
    try {
      const offer = await createRideOffer(rideId, driverId, price);
      setSubmittedOfferId(offer.id);
      setSubmittedForRideId(rideId);
    } catch (err) {
      Alert.alert("Erro ao enviar proposta", getErrorMessage(err));
    } finally {
      setSubmittingOffer(false);
    }
  }

  // Assina a própria proposta pra saber se o passageiro aceitou ou recusou.
  useEffect(() => {
    if (!submittedOfferId || !submittedForRideId) return;
    const unsubscribe = listenForOfferStatus(submittedOfferId, (offerStatus) => {
      if (offerStatus === "accepted") {
        router.push(`/(driver)/ride/${submittedForRideId}`);
      } else if (offerStatus === "rejected") {
        setSubmittedOfferId(null);
        setSubmittedForRideId(null);
      }
    });
    return unsubscribe;
  }, [submittedOfferId, submittedForRideId, router]);

  // Se a corrida some do pool aberto por outro motivo (passageiro cancelou,
  // por exemplo) enquanto ainda estamos esperando resposta, limpa o estado
  // de espera — senão ficaria preso mostrando "aguardando" pra sempre.
  useEffect(() => {
    if (submittedForRideId && !requests.some((r) => r.id === submittedForRideId)) {
      setSubmittedOfferId(null);
      setSubmittedForRideId(null);
    }
  }, [requests, submittedForRideId]);

  const nextRequest = requests[0] ?? null;
  const waitingForResponse = submittedForRideId != null && submittedForRideId === nextRequest?.id;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView initialCenter={center} selectable="none" />
      </View>

      <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.counter}>R$ {todayGross.toFixed(2)}</Text>
          <Text style={styles.counterLabel}>hoje</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ true: colors.brandGreen, false: colors.border }}
        />
      </View>

      <RideBottomSheet index={sheetIndex} snapPoints={SNAP_POINTS} onChangeIndex={setSheetIndex}>
        {!isOnline ? (
          <View style={styles.center}>
            <Text style={styles.hint}>Fique online para ver corridas disponíveis.</Text>
          </View>
        ) : !nextRequest ? (
          <View style={styles.center}>
            <Text style={styles.hint}>Nenhuma corrida disponível no momento.</Text>
          </View>
        ) : waitingForResponse ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandGreen} />
            <Text style={styles.hint}>Proposta enviada — aguardando o passageiro escolher...</Text>
          </View>
        ) : (
          <RideRequestCard
            ride={nextRequest}
            submitting={submittingOffer}
            onSubmitOffer={(price) => handleSubmitOffer(nextRequest.id, price)}
          />
        )}
      </RideBottomSheet>

      <DriverSideMenu
        visible={menuVisible}
        profile={profile}
        onClose={() => setMenuVisible(false)}
        onSelectProfile={() => router.push("/(driver)/profile")}
        onSelectDocuments={() => router.push("/(driver)/documents")}
        onSelectEarnings={() => router.push("/(driver)/earnings")}
        onSelectHistory={() => router.push("/(driver)/history")}
        onSignOut={() => signOut()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menuButton: {
    position: "absolute",
    top: 56,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  menuIcon: { fontSize: 20, color: colors.textPrimary },
  topBar: {
    position: "absolute",
    top: 56,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  counter: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, textAlign: "right" },
  counterLabel: { fontSize: 11, color: colors.textSecondary, textAlign: "right" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8 },
  hint: { color: colors.textSecondary, textAlign: "center" },
});
