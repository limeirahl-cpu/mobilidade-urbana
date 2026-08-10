import { supabase } from "@/services/supabase";

interface Point {
  lat: number;
  lng: number;
}

/** ETA (em minutos) até o motorista online mais próximo daquela categoria,
 * via a RPC `estimate_driver_eta_minutes` (SECURITY DEFINER — devolve só o
 * número, nunca a localização dos motoristas). Retorna null quando não há
 * nenhum motorista online nessa categoria. */
export async function estimateDriverEtaMinutes(categoryId: string, pickup: Point): Promise<number | null> {
  const { data, error } = await supabase.rpc("estimate_driver_eta_minutes", {
    p_category_id: categoryId,
    p_lat: pickup.lat,
    p_lng: pickup.lng,
  });
  if (error) throw error;
  return data ?? null;
}
