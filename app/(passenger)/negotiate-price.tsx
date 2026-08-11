import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { getNegotiationRange, simulateDriverOffers, type DriverOffer } from "@/utils/priceNegotiation";

type Step = "pricing" | "searching" | "offers";

const PRICE_STEP = 1;
const SEARCH_DELAY_MS = 2000;
const OFFER_REVEAL_INTERVAL_MS = 900;

// Anéis pulsando estilo "radar" — mesma ideia da animação CSS já usada nos
// marcadores do mapa (mapboxMapHtml.ts), só que em RN puro, sem lib nova.
function PulseRing({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0.15, 0] });

  return <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />;
}

export default function NegotiatePrice() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pickupLat: string;
    pickupLng: string;
    pickupLabel: string;
    dropoffLat: string;
    dropoffLng: string;
    dropoffLabel: string;
    categoryId: string;
    categoryLabel: string;
    paymentMethod: string;
    distanceKm: string;
    durationMin: string;
    estimatedFare: string;
    couponId: string;
    discountAmount: string;
  }>();

  const estimatedFare = Number(params.estimatedFare);
  const range = getNegotiationRange(estimatedFare);

  const [step, setStep] = useState<Step>("pricing");
  const [price, setPrice] = useState(estimatedFare);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceText, setPriceText] = useState("");
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (step !== "searching") return;
    const timer = setTimeout(() => {
      setOffers(simulateDriverOffers(price, params.categoryLabel));
      setVisibleCount(0);
      setStep("offers");
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "offers" || visibleCount >= offers.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), OFFER_REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [step, visibleCount, offers.length]);

  function clamp(value: number): number {
    return Math.min(range.max, Math.max(range.min, value));
  }

  function handleDecrease() {
    setPrice((p) => clamp(Math.round((p - PRICE_STEP) * 100) / 100));
  }

  function handleIncrease() {
    setPrice((p) => clamp(Math.round((p + PRICE_STEP) * 100) / 100));
  }

  function handleStartEditPrice() {
    setPriceText(price.toFixed(2));
    setEditingPrice(true);
  }

  function handleFinishEditPrice() {
    const parsed = Number(priceText.replace(",", "."));
    if (!Number.isNaN(parsed)) setPrice(clamp(parsed));
    setEditingPrice(false);
  }

  function handleRequestRide() {
    setStep("searching");
  }

  function handleCancelSearch() {
    setStep("pricing");
  }

  function handleAdjustValue() {
    setStep("pricing");
    setOffers([]);
    setVisibleCount(0);
  }

  function navigateToConfirm(fare: number, suggestedFare?: number) {
    router.push({
      pathname: "/(passenger)/confirm-ride",
      params: {
        ...params,
        finalFare: String(fare),
        suggestedFare: suggestedFare != null ? String(suggestedFare) : "",
      },
    });
  }

  function handleAcceptOffer(offer: DriverOffer) {
    navigateToConfirm(offer.price, price);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{step === "offers" ? "Escolha um motorista" : "Defina seu preço"}</Text>
        <View style={{ width: 60 }} />
      </View>

      {step === "pricing" && (
        <View style={styles.content}>
          <Text style={styles.categoryLabel}>{params.categoryLabel}</Text>

          <View style={styles.priceRow}>
            <TouchableOpacity style={styles.stepButton} onPress={handleDecrease}>
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>

            {editingPrice ? (
              <TextInput
                style={styles.priceInput}
                value={priceText}
                onChangeText={setPriceText}
                keyboardType="decimal-pad"
                autoFocus
                onBlur={handleFinishEditPrice}
                onSubmitEditing={handleFinishEditPrice}
              />
            ) : (
              <TouchableOpacity onPress={handleStartEditPrice}>
                <Text style={styles.price}>R$ {price.toFixed(2)}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.stepButton} onPress={handleIncrease}>
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Toque no valor pra digitar · entre R$ {range.min.toFixed(2)} e R$ {range.max.toFixed(2)}
          </Text>

          <TouchableOpacity style={styles.requestButton} onPress={handleRequestRide}>
            <Text style={styles.requestButtonText}>Solicitar viagem</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "searching" && (
        <View style={styles.centerContent}>
          <View style={styles.radarWrapper}>
            <PulseRing delay={0} />
            <PulseRing delay={600} />
            <View style={styles.radarCore}>
              <Text style={styles.radarPrice}>R$ {price.toFixed(2)}</Text>
            </View>
          </View>
          <Text style={styles.searchingText}>Procurando motoristas...</Text>
          <TouchableOpacity onPress={handleCancelSearch}>
            <Text style={styles.linkText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "offers" && (
        <ScrollView contentContainerStyle={styles.offersList}>
          {offers.slice(0, visibleCount).map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{offer.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerName}>
                  {offer.name} · ★ {offer.rating.toFixed(1)}
                </Text>
                <Text style={styles.offerVehicle}>{offer.vehicle}</Text>
                <Text style={styles.offerEta}>{offer.etaMinutes} min de distância</Text>
              </View>
              <View style={styles.offerActionCol}>
                <Text style={styles.offerPrice}>R$ {offer.price.toFixed(2)}</Text>
                <TouchableOpacity style={styles.acceptOfferButton} onPress={() => handleAcceptOffer(offer)}>
                  <Text style={styles.acceptOfferButtonText}>Aceitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {visibleCount < offers.length && <ActivityIndicator style={{ marginTop: 12 }} color={colors.brandGreen} />}

          <TouchableOpacity onPress={handleAdjustValue} style={styles.adjustLink}>
            <Text style={styles.linkText}>Ajustar valor</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
  },
  back: { color: colors.textPrimary, fontWeight: "600", width: 60 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  content: { padding: 16, gap: 10, alignItems: "center" },
  categoryLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 12 },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: { fontSize: 26, fontWeight: "700", color: colors.textPrimary },
  price: { fontSize: 42, fontWeight: "800", color: colors.textPrimary, minWidth: 140, textAlign: "center" },
  priceInput: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.textPrimary,
    minWidth: 140,
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.brandGreen,
  },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 12, textAlign: "center" },
  requestButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 28,
  },
  requestButtonText: { color: colors.black, fontSize: 16, fontWeight: "800" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  radarWrapper: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.brandGreen,
  },
  radarCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  radarPrice: { color: colors.black, fontWeight: "800", fontSize: 16 },
  searchingText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  linkText: { color: colors.info, fontWeight: "700" },
  offersList: { padding: 16, gap: 12 },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: colors.black },
  offerName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  offerVehicle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  offerEta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  offerActionCol: { alignItems: "flex-end", gap: 6 },
  offerPrice: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  acceptOfferButton: { backgroundColor: colors.brandGreen, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  acceptOfferButtonText: { color: colors.black, fontWeight: "700", fontSize: 12 },
  adjustLink: { alignSelf: "center", marginTop: 8, padding: 8 },
});
