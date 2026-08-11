// Edge Function — recebe a notificação (IPN/webhook) do Mercado Pago quando
// o status de um pagamento muda. Nunca confia no conteúdo do webhook em si
// (qualquer um poderia forjar uma request pra essa URL) — sempre busca o
// pagamento de verdade na API do Mercado Pago antes de atualizar o banco.
import { createClient } from "jsr:@supabase/supabase-js@2";

function mapMercadoPagoStatus(status: string): "pending" | "approved" | "rejected" | "cancelled" {
  if (status === "approved") return "approved";
  if (status === "cancelled") return "cancelled";
  if (status === "pending" || status === "in_process" || status === "authorized") return "pending";
  return "rejected";
}

Deno.serve(async (req) => {
  try {
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) {
      return new Response("MERCADOPAGO_ACCESS_TOKEN não configurado", { status: 500 });
    }

    const url = new URL(req.url);
    let paymentId = url.searchParams.get("id") ?? url.searchParams.get("data.id");
    let topic = url.searchParams.get("topic") ?? url.searchParams.get("type");

    if (!paymentId && req.method === "POST") {
      const body = await req.json().catch(() => null);
      paymentId = body?.data?.id ?? null;
      topic = body?.type ?? topic;
    }

    // Só nos interessam notificações de pagamento — outros tópicos (ex:
    // merchant_order) são confirmados com 200 sem processar nada.
    if (!paymentId || (topic && topic !== "payment")) {
      return new Response("ok", { status: 200 });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mercadoPagoToken}` },
    });
    if (!mpResponse.ok) {
      return new Response("payment not found", { status: 200 });
    }
    const payment = await mpResponse.json();
    const ourPaymentId = payment.external_reference;
    if (!ourPaymentId) {
      return new Response("ok", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient
      .from("payments")
      .update({
        status: mapMercadoPagoStatus(payment.status),
        mp_payment_id: String(payment.id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ourPaymentId);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
