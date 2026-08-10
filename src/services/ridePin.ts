import { supabase } from "@/services/supabase";

export async function createPinForRide(rideId: string): Promise<string> {
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const { error } = await supabase.from("ride_pins").insert({ ride_id: rideId, pin });
  if (error) throw error;
  return pin;
}

export async function fetchPin(rideId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ride_pins")
    .select("pin")
    .eq("ride_id", rideId)
    .maybeSingle();
  if (error) throw error;
  return data?.pin ?? null;
}

/** Returns true if the PIN matched and the ride moved to in_progress, false if it didn't. */
export async function startRideWithPin(rideId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("start_ride_with_pin", { ride_id: rideId, pin });
  if (error) throw error;
  return data === true;
}
