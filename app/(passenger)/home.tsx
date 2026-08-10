import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MapWebView, type LatLng, type SelectableTarget } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import { fetchActiveCategories } from "@/services/categories";
import { getRoute } from "@/services/directions";
import { createRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { RideCategory } from "@/types/database";
import { estimateFareForCategory, haversineDistanceKm } from "@/utils/distance";
import { getErrorMessage } from "@/utils/errors";

const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const SNAP_POINTS = ["20%", "55%"];
const FALLBACK_SPEED_KMH = 30;

export default function PassengerHome() {
  const router = useRouter();
  const { session } = useAuth();
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [selecting, setSelecting] = useState<SelectableTarget>("none");
  const [sheetIndex, setSheetIndex] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

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

  useEffect(() => {
    fetchActiveCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setLoadingRoute(true);
    getRoute(pickup, dropoff)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setRoute(result);
        } else {
          const distanceKm = haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
          setRoute({ distanceKm, durationMin: (distanceKm / FALLBACK_SPEED_KMH) * 60 });
        }
      })
      .finally(() => !cancelled && setLoadingRoute(false));
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff]);

  function handleSelectLocation(point: LatLng) {
    if (selecting === "pickup") setPickup(point);
    else if (selecting === "dropoff") setDropoff(point);
  }

  function openDestinationPicker() {
    setSelecting("dropoff");
    setSheetIndex(1);
  }

  async function handleRequestRide() {
    if (!session?.user || !pickup || !dropoff || !route || !selectedCategoryId) return;
    const category = categories.find((c) => c.id === selectedCategoryId);
    if (!category) return;

    setRequesting(true);
    try {
      const fare = estimateFareForCategory(category, route.distanceKm, route.durationMin);
      const ride = await createRide({
        passengerId: session.user.id,
        categoryId: category.id,
        pickup,
        dropoff,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        fare,
      });
      router.push(`/(passenger)/ride/${ride.id}`);
    } catch (err) {
      Alert.alert("Erro ao pedir corrida", getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  }

  const expanded = sheetIndex === 1;
  const canRequest = !!pickup && !!dropoff && !!route && !!selectedCategoryId;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView
          initialCenter={center}
          pickup={pickup}
          dropoff={dropoff}
          selectable={selecting}
          onSelectLocation={handleSelectLocation}
        />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sair</Text>
      </TouchableOpacity>

      <RideBottomSheet index={sheetIndex} snapPoints={SNAP_POINTS} onChangeIndex={setSheetIndex}>
        {!expanded ? (
          <TouchableOpacity style={styles.searchBar} onPress={openDestinationPicker}>
            <View style={styles.searchDot} />
            <Text style={styles.searchPlaceholder}>Para onde vamos?</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Para onde vamos?</Text>

            <TouchableOpacity
              style={[styles.addressRow, selecting === "pickup" && styles.addressRowActive]}
              onPress={() => setSelecting("pickup")}
            >
              <View style={[styles.addressDot, { backgroundColor: colors.success }]} />
              <Text style={styles.addressText}>{pickup ? "Sua localização atual" : "Definindo embarque..."}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addressRow, selecting === "dropoff" && styles.addressRowActive]}
              onPress={() => setSelecting("dropoff")}
            >
              <View style={[styles.addressDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.addressText}>
                {dropoff ? `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}` : "Toque no mapa para marcar o destino"}
              </Text>
            </TouchableOpacity>

            {pickup && dropoff && (
              <>
                <Text style={styles.sectionLabel}>Escolha a categoria</Text>
                {loadingRoute || !route ? (
                  <ActivityIndicator style={{ marginVertical: 12 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    {categories.map((category) => {
                      const fare = estimateFareForCategory(category, route.distanceKm, route.durationMin);
                      const active = selectedCategoryId === category.id;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.categoryCard, active && styles.categoryCardActive]}
                          onPress={() => setSelectedCategoryId(category.id)}
                        >
                          <Text style={active ? styles.categoryLabelActive : styles.categoryLabel}>
                            {category.label}
                          </Text>
                          <Text style={active ? styles.categoryFareActive : styles.categoryFare}>
                            R$ {fare.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                {route && (
                  <Text style={styles.routeInfo}>
                    {route.distanceKm.toFixed(1)} km · {Math.round(route.durationMin)} min
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity style={styles.requestButton} onPress={handleRequestRide} disabled={!canRequest || requesting}>
              {requesting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.requestButtonText}>Pedir corrida</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </RideBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  signOutButton: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  signOutText: { color: colors.danger, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  searchDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.black },
  searchPlaceholder: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressRowActive: { borderColor: colors.brandYellow, backgroundColor: "#FFFBEB" },
  addressDot: { width: 10, height: 10, borderRadius: 5 },
  addressText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  sectionLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  categoryList: { gap: 10, paddingVertical: 4 },
  categoryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 100,
  },
  categoryCardActive: { backgroundColor: colors.brandYellow, borderColor: colors.brandYellow },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  categoryLabelActive: { fontSize: 13, fontWeight: "700", color: colors.black },
  categoryFare: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginTop: 4 },
  categoryFareActive: { fontSize: 15, fontWeight: "800", color: colors.black, marginTop: 4 },
  routeInfo: { fontSize: 12, color: colors.textSecondary },
  requestButton: { backgroundColor: colors.black, borderRadius: 12, padding: 16, alignItems: "center" },
  requestButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
