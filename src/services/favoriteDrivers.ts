import { supabase } from "@/services/supabase";
import type { Profile } from "@/types/database";

export async function fetchFavoriteDrivers(passengerId: string): Promise<Profile[]> {
  const { data: favorites, error } = await supabase
    .from("favorite_drivers")
    .select("driver_id")
    .eq("passenger_id", passengerId);
  if (error) throw error;
  if (!favorites || favorites.length === 0) return [];

  const driverIds = favorites.map((f) => f.driver_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", driverIds);
  if (profilesError) throw profilesError;
  return profiles ?? [];
}

export async function isFavoriteDriver(passengerId: string, driverId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorite_drivers")
    .select("driver_id")
    .eq("passenger_id", passengerId)
    .eq("driver_id", driverId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function addFavoriteDriver(passengerId: string, driverId: string): Promise<void> {
  const { error } = await supabase
    .from("favorite_drivers")
    .insert({ passenger_id: passengerId, driver_id: driverId });
  if (error) throw error;
}

export async function removeFavoriteDriver(passengerId: string, driverId: string): Promise<void> {
  const { error } = await supabase
    .from("favorite_drivers")
    .delete()
    .eq("passenger_id", passengerId)
    .eq("driver_id", driverId);
  if (error) throw error;
}
