import { supabase } from "@/services/supabase";
import type { CardPaymentData, PixPaymentData, SavedPaymentMethod, SavedPaymentMethodType } from "@/types/database";

export async function fetchSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedPaymentMethod(
  userId: string,
  type: SavedPaymentMethodType,
  data: CardPaymentData | PixPaymentData
): Promise<SavedPaymentMethod> {
  const { data: row, error } = await supabase
    .from("payment_methods")
    .insert({ user_id: userId, type, data, is_default: false })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function deleteSavedPaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.rpc("set_default_payment_method", { p_id: id });
  if (error) throw error;
}
