import { supabase } from "@/services/supabase";
import type { SavedAddress } from "@/types/database";

export async function fetchSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedAddress(
  userId: string,
  label: string,
  lat: number,
  lng: number,
  addressText?: string
): Promise<SavedAddress> {
  const { data, error } = await supabase
    .from("saved_addresses")
    .insert({ user_id: userId, label, lat, lng, address_text: addressText ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSavedAddress(id: string): Promise<void> {
  const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
  if (error) throw error;
}
