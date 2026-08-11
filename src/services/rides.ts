import { supabase } from "@/services/supabase";
import type { Ride } from "@/types/database";

interface Point {
  lat: number;
  lng: number;
}

interface CreateRideInput {
  passengerId: string;
  categoryId: string;
  paymentMethod: string;
  pickup: Point;
  dropoff: Point;
  distanceKm: number;
  durationMin: number;
  suggestedFare: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  couponId?: string;
  discountAmount?: number;
}

/**
 * A corrida nasce assim que o passageiro entra na busca por motorista
 * (antes de qualquer proposta chegar) — é isso que a torna visível pros
 * motoristas online da categoria via `rides_select_own_or_open_pool`, e é o
 * que dá pra `ride_offers` uma corrida real pra referenciar. `estimated_fare`
 * só é preenchido depois, quando uma proposta é aceita (accept_ride_offer,
 * 0016) — até lá, `suggested_fare` é o único valor monetário que existe.
 */
export async function createRide(input: CreateRideInput): Promise<Ride> {
  const { data, error } = await supabase
    .from("rides")
    .insert({
      passenger_id: input.passengerId,
      category_id: input.categoryId,
      payment_method: input.paymentMethod,
      status: "requested",
      pickup_lat: input.pickup.lat,
      pickup_lng: input.pickup.lng,
      pickup_address: input.pickupAddress ?? null,
      dropoff_lat: input.dropoff.lat,
      dropoff_lng: input.dropoff.lng,
      dropoff_address: input.dropoffAddress ?? null,
      estimated_distance_km: input.distanceKm,
      estimated_duration_min: input.durationMin,
      suggested_fare: input.suggestedFare,
      coupon_id: input.couponId ?? null,
      discount_amount: input.discountAmount ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function startHeadingToPickup(rideId: string): Promise<void> {
  const { error } = await supabase.from("rides").update({ status: "arriving" }).eq("id", rideId);
  if (error) throw error;
}

// arriving -> in_progress only happens via ridePin.ts's startRideWithPin()
// RPC now — the RLS policy no longer allows a plain client update for it.

export async function completeRide(rideId: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", rideId);
  if (error) throw error;
}

export async function cancelRide(rideId: string, actorId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: actorId,
      cancellation_reason: reason ?? null,
    })
    .eq("id", rideId);
  if (error) throw error;
}

export async function fetchRide(rideId: string): Promise<Ride | null> {
  const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOpenRideRequests(categoryId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq("status", "requested")
    .eq("category_id", categoryId)
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRideHistory(role: "passenger" | "driver", userId: string): Promise<Ride[]> {
  const column = role === "passenger" ? "passenger_id" : "driver_id";
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq(column, userId)
    .in("status", ["completed", "cancelled"])
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
