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

interface PaymentApprovalWaiter {
  promise: Promise<boolean>;
  cancel: () => void;
}

/** Espera o status do pagamento mudar via Realtime — resolve true se
 * aprovado, false se rejeitado/cancelado. Nome do canal com sufixo
 * aleatório, mesmo padrão de useRide/useDriverStatus. `cancel()` derruba
 * a inscrição sem resolver a promise, pra quando o usuário fecha o
 * checkout manualmente antes de terminar. */
export function waitForPaymentApproval(paymentId: string): PaymentApprovalWaiter {
  const channel = supabase.channel(`payment-${paymentId}-${Math.random().toString(36).slice(2, 10)}`);
  let resolvePromise: (approved: boolean) => void;

  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
    channel
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

  return {
    promise,
    cancel: () => {
      supabase.removeChannel(channel);
      resolvePromise(false);
    },
  };
}
