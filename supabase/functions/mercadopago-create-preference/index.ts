// Edge Function — cria uma preferência de pagamento no Mercado Pago
// (Checkout Pro) e uma linha em `payments` (status "pending"). A Access
// Token do Mercado Pago só existe aqui, como secret desta function — nunca
// no app. Configure com:
//   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=seu-token-de-teste-ou-producao
//
// TODO antes de produção: trocar o secret pela Access Token de produção do
// Mercado Pago (hoje é pra rodar com credenciais de teste/sandbox).
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  amount: number;
  description: string;
  method: "pix" | "cartao_credito" | "cartao_debito";
  rideId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) {
      return new Response(JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com o JWT de quem chamou, só pra identificar o usuário.
    const authClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    if (!body.amount || body.amount <= 0 || !body.method || !body.rideId) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com a service role — ignora RLS, é o único jeito de escrever
    // em `payments` (o cliente do app só tem policy de select).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        user_id: user.id,
        ride_id: body.rideId,
        amount: body.amount,
        payment_method: body.method,
        status: "pending",
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: body.description || "Corrida Urbix",
            quantity: 1,
            unit_price: body.amount,
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: "urbix://payment-return",
          failure: "urbix://payment-return",
          pending: "urbix://payment-return",
        },
        auto_return: "approved",
        notification_url: webhookUrl,
        external_reference: payment.id,
      }),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      throw new Error(`Mercado Pago: ${errText}`);
    }

    const preference = await mpResponse.json();

    await adminClient.from("payments").update({ mp_preference_id: preference.id }).eq("id", payment.id);

    return new Response(JSON.stringify({ initPoint: preference.init_point, paymentId: payment.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
