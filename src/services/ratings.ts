import { supabase } from "@/services/supabase";
import type { RideRating } from "@/types/database";

export async function submitRating(
  rideId: string,
  raterId: string,
  rateeId: string,
  stars: number,
  comment?: string
): Promise<void> {
  const { error } = await supabase
    .from("ride_ratings")
    .insert({ ride_id: rideId, rater_id: raterId, ratee_id: rateeId, stars, comment: comment ?? null });
  if (error) throw error;
}

export async function fetchMyRatingForRide(rideId: string, raterId: string): Promise<RideRating | null> {
  const { data, error } = await supabase
    .from("ride_ratings")
    .select("*")
    .eq("ride_id", rideId)
    .eq("rater_id", raterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
