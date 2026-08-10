import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { RideRequestCard } from "@/components/ride/RideRequestCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useDriverStatus } from "@/hooks/useDriverStatus";
import { useIncomingRideRequests } from "@/hooks/useIncomingRideRequests";
import { signOut } from "@/services/auth";
import { setOnline } from "@/services/driverStatus";
import { acceptRide } from "@/services/rides";
import { getErrorMessage } from "@/utils/errors";

export default function DriverHome() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const driverId = session?.user.id ?? null;
  const status = useDriverStatus(driverId);
  const isOnline = status?.is_online ?? false;
  useDriverLocation(driverId, isOnline);
  const requests = useIncomingRideRequests(isOnline);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Olá, {profile?.full_name}</Text>
          <Text style={styles.subtitle}>{isOnline ? "Online" : "Offline"}</Text>
        </View>
        <View style={styles.headerRight}>
          <Switch value={isOnline} onValueChange={toggleOnline} />
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOut}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isOnline ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Fique online para ver corridas disponíveis.</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Nenhuma corrida disponível no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RideRequestCard
              ride={item}
              accepting={acceptingId === item.id}
              onAccept={() => handleAccept(item.id)}
            />
          )}
        />
      )}
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  signOut: { color: "#dc2626", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  hint: { color: "#6b7280", textAlign: "center" },
  list: { padding: 16, gap: 12 },
});
