import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
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
import { getRoute, type RouteEstimate } from "@/services/directions";
import { estimateDriverEtaMinutes } from "@/services/driverEta";
import { resolvePlaceDetails, searchAddress, type AddressResult } from "@/services/geocoding";
import { colors } from "@/theme/colors";
import type { RideCategory, SavedAddress } from "@/types/database";
import { estimateFareForCategory, haversineDistanceKm } from "@/utils/distance";
import { getErrorMessage } from "@/utils/errors";
import { PAYMENT_METHODS } from "@/utils/paymentMethods";

const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const SNAP_POINTS = ["20%", "65%"];
const FALLBACK_SPEED_KMH = 30;
const SEARCH_DEBOUNCE_MS = 400;

function categoryIcon(key: string): string {
  return key === "moto" ? "🏍️" : "🚗";
}

export default function PassengerHome() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [pickupLabel, setPickupLabel] = useState<string | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [dropoffLabel, setDropoffLabel] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selecting, setSelecting] = useState<SelectableTarget>("none");
  const [sheetIndex, setSheetIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);

  const [categories, setCategories] = useState<RideCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [driverEtas, setDriverEtas] = useState<Record<string, number | null>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const here = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCenter(here);
      setPickup(here);
      setPickupLabel("Sua localização atual");
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
          setRoute({ distanceKm, durationMin: (distanceKm / FALLBACK_SPEED_KMH) * 60, coordinates: [] });
        }
      })
      .finally(() => !cancelled && setLoadingRoute(false));
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff]);

  useEffect(() => {
    if (!pickup || categories.length === 0) return;
    let cancelled = false;
    categories.forEach((category) => {
      estimateDriverEtaMinutes(category.id, pickup)
        .then((minutes) => !cancelled && setDriverEtas((prev) => ({ ...prev, [category.id]: minutes })))
        .catch(() => !cancelled && setDriverEtas((prev) => ({ ...prev, [category.id]: null })));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, categories]);

  useEffect(() => {
    if (selecting === "none" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchAddress(searchQuery, pickup ?? undefined)
        .then((results) => !cancelled && setSearchResults(results))
        .finally(() => !cancelled && setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selecting]);

  function activateTarget(target: SelectableTarget) {
    setSelecting(target);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleSelectLocation(point: LatLng) {
    if (selecting === "pickup") {
      setPickup(point);
      setPickupLabel(null);
    } else if (selecting === "dropoff") {
      setDropoff(point);
      setDropoffLabel(null);
    }
  }

  function openDestinationPicker() {
    activateTarget("dropoff");
    setSheetIndex(1);
  }

  async function handleSelectSearchResult(result: AddressResult) {
    setResolvingPlace(true);
    try {
      const point = await resolvePlaceDetails(result.placeId);
      if (!point) {
        Alert.alert("Endereço não encontrado", "Não conseguimos localizar esse endereço. Tente outro.");
        return;
      }
      if (selecting === "pickup") {
        setPickup(point);
        setPickupLabel(result.label);
      } else if (selecting === "dropoff") {
        setDropoff(point);
        setDropoffLabel(result.label);
      }
      setSearchQuery("");
      setSearchResults([]);
    } finally {
      setResolvingPlace(false);
    }
  }

  function handleSelectSavedAddress(address: SavedAddress) {
    if (selecting === "pickup") {
      setPickup({ lat: address.lat, lng: address.lng });
      setPickupLabel(address.label);
    } else {
      setDropoff({ lat: address.lat, lng: address.lng });
      setDropoffLabel(address.label);
    }
  }

  async function handleUseCurrentLocation() {
    setLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const here = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      if (selecting === "pickup") {
        setPickup(here);
        setPickupLabel("Sua localização atual");
      } else if (selecting === "dropoff") {
        setDropoff(here);
        setDropoffLabel("Sua localização atual");
      }
    } finally {
      setLocatingMe(false);
    }
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

  function handleContinue() {
    if (!pickup || !dropoff || !route || !selectedCategory || finalFare == null || !paymentMethod) return;

    router.push({
      pathname: "/(passenger)/negotiate-price",
      params: {
        pickupLat: String(pickup.lat),
        pickupLng: String(pickup.lng),
        pickupLabel: pickupLabel ?? "",
        dropoffLat: String(dropoff.lat),
        dropoffLng: String(dropoff.lng),
        dropoffLabel: dropoffLabel ?? "",
        categoryId: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        paymentMethod,
        distanceKm: String(route.distanceKm),
        durationMin: String(route.durationMin),
        estimatedFare: String(finalFare),
        couponId: appliedCoupon?.couponId ?? "",
        discountAmount: String(appliedCoupon?.discountAmount ?? 0),
      },
    });
  }

  const expanded = sheetIndex === 1;
  const canRequest = !!pickup && !!dropoff && !!route && !!selectedCategoryId && !!paymentMethod;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapWebView
          initialCenter={center}
          pickup={pickup ? { ...pickup, gender: profile?.gender } : null}
          dropoff={dropoff}
          route={route?.coordinates}
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
          <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Para onde vamos?</Text>

            <TouchableOpacity
              style={[styles.addressRow, selecting === "pickup" && styles.addressRowActive]}
              onPress={() => activateTarget("pickup")}
            >
              <View style={[styles.addressDot, { backgroundColor: colors.success }]} />
              <Text style={styles.addressText}>
                {pickup ? pickupLabel ?? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : "Definindo embarque..."}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addressRow, selecting === "dropoff" && styles.addressRowActive]}
              onPress={() => activateTarget("dropoff")}
            >
              <View style={[styles.addressDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.addressText}>
                {dropoff
                  ? dropoffLabel ?? `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`
                  : "Toque no mapa para marcar o destino"}
              </Text>
            </TouchableOpacity>

            {selecting !== "none" && (
              <View style={styles.searchSection}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar endereço..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                <TouchableOpacity style={styles.currentLocationButton} onPress={handleUseCurrentLocation} disabled={locatingMe}>
                  {locatingMe ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.currentLocationText}>📍 Usar minha localização atual</Text>
                  )}
                </TouchableOpacity>

                {(searching || resolvingPlace) && <ActivityIndicator style={{ marginVertical: 8 }} />}

                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.placeId}
                    style={styles.resultRow}
                    onPress={() => handleSelectSearchResult(result)}
                    disabled={resolvingPlace}
                  >
                    <Text style={styles.resultText}>{result.label}</Text>
                  </TouchableOpacity>
                ))}

                {savedAddresses.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.savedAddressList}
                  >
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

                <Text style={styles.hint}>Ou toque no mapa para marcar o ponto exato.</Text>
              </View>
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
                      const eta = driverEtas[category.id];
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.categoryCard, active && styles.categoryCardActive]}
                          onPress={() => handleSelectCategory(category.id)}
                        >
                          <Text style={styles.categoryIcon}>{categoryIcon(category.key)}</Text>
                          <Text style={active ? styles.categoryLabelActive : styles.categoryLabel}>
                            {category.label}
                          </Text>
                          <Text style={active ? styles.categoryFareActive : styles.categoryFare}>
                            R$ {fare.toFixed(2)}
                          </Text>
                          <Text style={active ? styles.categoryMetaActive : styles.categoryMeta}>
                            👤 {category.capacity_passengers} · {eta == null ? "Sem motoristas" : `${Math.ceil(eta)} min`}
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

                <Text style={styles.sectionLabel}>Forma de pagamento</Text>
                <View style={styles.paymentRow}>
                  {PAYMENT_METHODS.map((method) => {
                    const active = paymentMethod === method.key;
                    return (
                      <TouchableOpacity
                        key={method.key}
                        style={[styles.paymentChip, active && styles.paymentChipActive]}
                        onPress={() => setPaymentMethod(method.key)}
                      >
                        <Text style={active ? styles.paymentTextActive : styles.paymentText}>{method.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.requestButton} onPress={handleContinue} disabled={!canRequest}>
              <Text style={styles.requestButtonText}>Continuar</Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
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
  sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, marginBottom: 12 },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  addressRowActive: { borderColor: colors.brandGreen, backgroundColor: "#FFFBEB" },
  addressDot: { width: 10, height: 10, borderRadius: 5 },
  addressText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  searchSection: { gap: 10, marginBottom: 14 },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14 },
  currentLocationButton: { paddingVertical: 8 },
  currentLocationText: { fontSize: 14, fontWeight: "600", color: colors.info },
  resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultText: { fontSize: 14, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textSecondary },
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
  sectionLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 6 },
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
  categoryCardActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  categoryIcon: { fontSize: 22 },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  categoryLabelActive: { fontSize: 13, fontWeight: "700", color: colors.black },
  categoryFare: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginTop: 4 },
  categoryFareActive: { fontSize: 15, fontWeight: "800", color: colors.black, marginTop: 4 },
  categoryMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  categoryMetaActive: { fontSize: 11, color: colors.black, marginTop: 2 },
  routeInfo: { fontSize: 12, color: colors.textSecondary },
  couponRow: { flexDirection: "row", gap: 8, marginTop: 10 },
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
  couponApplied: { fontSize: 13, fontWeight: "700", color: colors.success, marginTop: 10 },
  paymentRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  paymentChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  paymentChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  paymentText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  paymentTextActive: { fontSize: 13, fontWeight: "700", color: colors.black },
  requestButton: { backgroundColor: colors.brandOrange, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16 },
  requestButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
