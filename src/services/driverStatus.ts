import { supabase } from "@/services/supabase";
import type { DriverStatus } from "@/types/database";

/** Via RPC (não update direto): o banco recusa ligar is_online enquanto o
 * motorista não estiver com verification_status='approved' — ver 0017. */
export async function setOnline(isOnline: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_driver_online", { p_online: isOnline });
  if (error) throw error;
}

export async function upsertLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading: number | null
): Promise<void> {
  const { error } = await supabase
    .from("driver_status")
    .update({ current_lat: lat, current_lng: lng, heading, updated_at: new Date().toISOString() })
    .eq("driver_id", driverId);
  if (error) throw error;
}

export async function fetchDriverStatus(driverId: string): Promise<DriverStatus | null> {
  const { data, error } = await supabase
    .from("driver_status")
    .select("*")
    .eq("driver_id", driverId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
