import { supabase } from "@/services/supabase";

export interface AppliedCoupon {
  couponId: string;
  discountAmount: number;
}

/** Returns null if the code is invalid, expired, exhausted, or below the coupon's minimum fare. */
export async function applyCoupon(code: string, fare: number): Promise<AppliedCoupon | null> {
  const { data, error } = await supabase.rpc("apply_coupon", { p_code: code, p_fare: fare });
  if (error) throw error;
  const row = data?.[0];
  if (!row || !row.coupon_id) return null;
  return { couponId: row.coupon_id, discountAmount: row.discount_amount };
}
