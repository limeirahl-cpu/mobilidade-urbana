import { supabase } from "@/services/supabase";
import type { Ride } from "@/types/database";

interface Point {
  lat: number;
  lng: number;
}

interface CreateRideInput {
  passengerId: string;
  categoryId: string;
  pickup: Point;
  dropoff: Point;
  distanceKm: number;
  durationMin: number;
  fare: number;
  pickupAddress?: string;
  dropoffAddress?: string;
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const { data, error } = await supabase
    .from("rides")
    .insert({
      passenger_id: input.passengerId,
      category_id: input.categoryId,
      status: "requested",
      pickup_lat: input.pickup.lat,
      pickup_lng: input.pickup.lng,
      pickup_address: input.pickupAddress ?? null,
      dropoff_lat: input.dropoff.lat,
      dropoff_lng: input.dropoff.lng,
      dropoff_address: input.dropoffAddress ?? null,
      estimated_distance_km: input.distanceKm,
      estimated_duration_min: input.durationMin,
      estimated_fare: input.fare,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Only succeeds if the ride was still open (`status='requested'`,
 * `driver_id` null) at the moment of the update — the RLS policy plus this
 * WHERE clause is what stops two drivers from accepting the same ride.
 * Returns null (instead of throwing) when someone else got there first.
 */
export async function acceptRide(rideId: string, driverId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from("rides")
    .update({ driver_id: driverId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", rideId)
    .eq("status", "requested")
    .is("driver_id", null)
    .select()
    .maybeSingle();

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

export async function cancelRide(rideId: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: actorId })
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
