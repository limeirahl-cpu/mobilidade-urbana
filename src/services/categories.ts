import { supabase } from "@/services/supabase";
import type { RideCategory } from "@/types/database";

export async function fetchActiveCategories(): Promise<RideCategory[]> {
  const { data, error } = await supabase
    .from("ride_categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategoryById(id: string): Promise<RideCategory | null> {
  const { data, error } = await supabase.from("ride_categories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
