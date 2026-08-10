import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { MapWebView, type LatLng } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { RideRequestCard } from "@/components/ride/RideRequestCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useIncomingRideRequests } from "@/hooks/useIncomingRideRequests";
import { signOut } from "@/services/auth";
import { setOnline } from "@/services/driverStatus";
import { acceptRide } from "@/services/rides";
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
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  async function toggleOnline(value: boolean) {
    if (!driverId) return;
    try {
      await setOnline(driverId, value);
    } catch (err) {
      Alert.alert("Erro", getErrorMessage(err));
    }
  }

  async function handleAccept(rideId: string) {
    if (!driverId) return;
    setAcceptingId(rideId);
    try {
      const ride = await acceptRide(rideId, driverId);
      if (!ride) {
        Alert.alert("Ops", "Essa corrida não está mais disponível.");
        return;
      }
      router.push(`/(driver)/ride/${ride.id}`);
    } catch (err) {
      Alert.alert("Erro ao aceitar", getErrorMessage(err));
    } finally {
      setAcceptingId(null);
    }
  }

  const nextRequest = requests[0] ?? null;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView initialCenter={center} selectable="none" />
      </View>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Olá, {profile?.full_name}</Text>
          <Text style={styles.subtitle}>{isOnline ? "Você está online" : "Você está offline"}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ true: colors.brandYellow, false: colors.border }}
          />
          <TouchableOpacity onPress={() => router.push("/(driver)/profile")}>
            <Text style={styles.historyLink}>Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(driver)/history")}>
            <Text style={styles.historyLink}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOut}>Sair</Text>
          </TouchableOpacity>
        </View>
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
        ) : (
          <RideRequestCard
            ride={nextRequest}
            accepting={acceptingId === nextRequest.id}
            onAccept={() => handleAccept(nextRequest.id)}
          />
        )}
      </RideBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyLink: { color: colors.textPrimary, fontWeight: "700" },
  signOut: { color: colors.danger, fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  hint: { color: colors.textSecondary, textAlign: "center" },
});
