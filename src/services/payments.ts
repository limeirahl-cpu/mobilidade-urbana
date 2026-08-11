import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/services/supabase";

export type RealPaymentMethod = "pix" | "cartao_credito" | "cartao_debito";

export function needsRealPayment(method: string): method is RealPaymentMethod {
  return method === "pix" || method === "cartao_credito" || method === "cartao_debito";
}

interface CreatePreferenceResult {
  initPoint: string;
  paymentId: string;
}

export async function createPaymentPreference(
  amount: number,
  description: string,
  method: RealPaymentMethod
): Promise<CreatePreferenceResult> {
  const { data, error } = await supabase.functions.invoke("mercadopago-create-preference", {
    body: { amount, description, method },
  });
  if (error) throw error;
  return data;
}

/** Abre o checkout do Mercado Pago no navegador do sistema (não no WebView
 * do mapa) — é o jeito recomendado pra fluxos de pagamento externos. */
export async function openPaymentCheckout(initPoint: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(initPoint, "urbix://payment-return");
}

/** Espera o status do pagamento mudar via Realtime — resolve true se
 * aprovado, false se rejeitado/cancelado. Nome do canal com sufixo
 * aleatório, mesmo padrão de useRide/useDriverStatus. */
export function waitForPaymentApproval(paymentId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = supabase
      .channel(`payment-${paymentId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${paymentId}` },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === "approved") {
            supabase.removeChannel(channel);
            resolve(true);
          } else if (status === "rejected" || status === "cancelled") {
            supabase.removeChannel(channel);
            resolve(false);
          }
        }
      )
      .subscribe();
  });
}
