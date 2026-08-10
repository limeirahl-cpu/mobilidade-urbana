import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { MapWebView, type LatLng, type SelectableTarget } from "@/components/map/MapWebView";
import { RideBottomSheet } from "@/components/ui/RideBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSavedAddresses } from "@/services/addresses";
import { signOut } from "@/services/auth";
import { fetchActiveCategories } from "@/services/categories";
import { applyCoupon, type AppliedCoupon } from "@/services/coupons";
import { getRoute } from "@/services/directions";
import { createPinForRide } from "@/services/ridePin";
import { createRide } from "@/services/rides";
import { colors } from "@/theme/colors";
import type { RideCategory, SavedAddress } from "@/types/database";
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
  const [dropoffLabel, setDropoffLabel] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selecting, setSelecting] = useState<SelectableTarget>("none");
  const [sheetIndex, setSheetIndex] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

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
    if (session?.user) {
      fetchSavedAddresses(session.user.id)
        .then(setSavedAddresses)
        .catch(() => setSavedAddresses([]));
    }
  }, [session?.user]);

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
    else if (selecting === "dropoff") {
      setDropoff(point);
      setDropoffLabel(null);
    }
  }

  function openDestinationPicker() {
    setSelecting("dropoff");
    setSheetIndex(1);
  }

  function handleSelectSavedAddress(address: SavedAddress) {
    setDropoff({ lat: address.lat, lng: address.lng });
    setDropoffLabel(address.label);
  }

  function handleSelectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setAppliedCoupon(null);
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const baseFare =
    selectedCategory && route ? estimateFareForCategory(selectedCategory, route.distanceKm, route.durationMin) : null;
  const finalFare =
    baseFare != null ? Math.max(baseFare - (appliedCoupon?.discountAmount ?? 0), 0) : null;

  async function handleApplyCoupon() {
    if (!couponCode.trim() || baseFare == null) return;
    setApplyingCoupon(true);
    try {
      const result = await applyCoupon(couponCode.trim(), baseFare);
      if (!result) {
        Alert.alert("Cupom inválido", "Esse código não existe, expirou ou já atingiu o limite de usos.");
        return;
      }
      setAppliedCoupon(result);
    } catch (err) {
      Alert.alert("Erro ao aplicar cupom", getErrorMessage(err));
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handleRequestRide() {
    if (!session?.user || !pickup || !dropoff || !route || !selectedCategory || finalFare == null) return;

    setRequesting(true);
    try {
      const ride = await createRide({
        passengerId: session.user.id,
        categoryId: selectedCategory.id,
        pickup,
        dropoff,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        fare: finalFare,
        couponId: appliedCoupon?.couponId,
        discountAmount: appliedCoupon?.discountAmount,
      });
      await createPinForRide(ride.id);
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

      <View style={styles.topRightButtons}>
        <TouchableOpacity style={styles.topButton} onPress={() => router.push("/(passenger)/profile")}>
          <Text style={styles.topButtonText}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topButton} onPress={() => router.push("/(passenger)/history")}>
          <Text style={styles.topButtonText}>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>

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
                {dropoff
                  ? dropoffLabel ?? `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`
                  : "Toque no mapa para marcar o destino"}
              </Text>
            </TouchableOpacity>

            {savedAddresses.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedAddressList}>
                {savedAddresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={styles.savedAddressChip}
                    onPress={() => handleSelectSavedAddress(address)}
                  >
                    <Text style={styles.savedAddressText}>{address.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

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
                          onPress={() => handleSelectCategory(category.id)}
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

                {selectedCategory &&
                  (appliedCoupon ? (
                    <Text style={styles.couponApplied}>
                      Cupom aplicado: -R$ {appliedCoupon.discountAmount.toFixed(2)} · Total: R$ {finalFare?.toFixed(2)}
                    </Text>
                  ) : (
                    <View style={styles.couponRow}>
                      <TextInput
                        style={styles.couponInput}
                        placeholder="Cupom de desconto"
                        autoCapitalize="characters"
                        value={couponCode}
                        onChangeText={setCouponCode}
                      />
                      <TouchableOpacity
                        style={styles.couponButton}
                        onPress={handleApplyCoupon}
                        disabled={!couponCode.trim() || applyingCoupon}
                      >
                        {applyingCoupon ? (
                          <ActivityIndicator color={colors.black} />
                        ) : (
                          <Text style={styles.couponButtonText}>Aplicar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
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
  topRightButtons: {
    position: "absolute",
    top: 56,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  topButton: {
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
  topButtonText: { color: colors.textPrimary, fontWeight: "700" },
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
  savedAddressList: { gap: 8, paddingVertical: 2 },
  savedAddressChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  savedAddressText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
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
  couponRow: { flexDirection: "row", gap: 8 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  couponButton: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  couponButtonText: { color: colors.textPrimary, fontWeight: "700" },
  couponApplied: { fontSize: 13, fontWeight: "700", color: colors.success },
  requestButton: { backgroundColor: colors.black, borderRadius: 12, padding: 16, alignItems: "center" },
  requestButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
