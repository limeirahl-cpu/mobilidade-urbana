import { supabase } from "@/services/supabase";
import type { Ride } from "@/types/database";
import { estimateFare, haversineDistanceKm } from "@/utils/distance";

interface Point {
  lat: number;
  lng: number;
}

export async function createRide(
  passengerId: string,
  pickup: Point,
  dropoff: Point,
  pickupAddress?: string,
  dropoffAddress?: string
): Promise<Ride> {
  const distanceKm = haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const fare = estimateFare(distanceKm);

  const { data, error } = await supabase
    .from("rides")
    .insert({
      passenger_id: passengerId,
      status: "requested",
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickupAddress ?? null,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_address: dropoffAddress ?? null,
      estimated_distance_km: distanceKm,
      estimated_fare: fare,
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

export async function startRide(rideId: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", rideId);
  if (error) throw error;
}

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

export async function fetchOpenRideRequests(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq("status", "requested")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
