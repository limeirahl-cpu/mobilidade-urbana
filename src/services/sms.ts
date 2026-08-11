import { supabase } from "@/services/supabase";

export interface SendCodeResult {
  cooldownMs: number;
}

/** Manda o código de verificação via SMS de verdade (Zenvia, através da
 * Edge Function send-verification-code) — o código em si nunca chega no
 * app, fica só no servidor. */
export async function sendVerificationCode(phoneE164: string): Promise<SendCodeResult> {
  const { data, error } = await supabase.functions.invoke("send-verification-code", {
    body: { phone: phoneE164 },
  });
  if (error) throw error;
  return data;
}

export type VerifyCodeFailureReason = "not_requested" | "expired" | "too_many_attempts" | "invalid";

export type VerifyCodeResult = { ok: true } | { ok: false; reason: VerifyCodeFailureReason };

export async function verifyCode(phoneE164: string, code: string): Promise<VerifyCodeResult> {
  const { data, error } = await supabase.functions.invoke("verify-phone-code", {
    body: { phone: phoneE164, code },
  });
  if (error) throw error;
  return data;
}
