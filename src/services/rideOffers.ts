import { supabase } from "@/services/supabase";
import type { Ride, RideOffer, RideOfferStatus } from "@/types/database";

export async function createRideOffer(rideId: string, driverId: string, price: number): Promise<RideOffer> {
  const { data, error } = await supabase
    .from("ride_offers")
    .insert({ ride_id: rideId, driver_id: driverId, price })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Aceita a proposta atomicamente (SECURITY DEFINER) — devolve a corrida já
 * com driver_id/status/estimated_fare atualizados. */
export async function acceptRideOffer(offerId: string): Promise<Ride> {
  const { data, error } = await supabase.rpc("accept_ride_offer", { p_offer_id: offerId });
  if (error) throw error;
  return data as Ride;
}

/** Passageiro: escuta novas propostas chegando pra uma corrida específica. */
export function listenForRideOffers(rideId: string, onOffer: (offer: RideOffer) => void): () => void {
  const channel = supabase
    .channel(`ride-offers-${rideId}-${Math.random().toString(36).slice(2, 10)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ride_offers", filter: `ride_id=eq.${rideId}` },
      (payload) => onOffer(payload.new as RideOffer)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Motorista: escuta a própria proposta pra saber se foi aceita ou recusada. */
export function listenForOfferStatus(offerId: string, onChange: (status: RideOfferStatus) => void): () => void {
  const channel = supabase
    .channel(`ride-offer-status-${offerId}-${Math.random().toString(36).slice(2, 10)}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "ride_offers", filter: `id=eq.${offerId}` },
      (payload) => onChange((payload.new as RideOffer).status)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
