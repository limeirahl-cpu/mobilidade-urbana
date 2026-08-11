// Edge Function — inicia uma verificação via Twilio Verify. Diferente de
// mandar SMS cru, o Verify é um serviço pronto pra esse fluxo exato: ele
// mesmo gera o código, cuida da expiração e do limite de tentativas/
// reenvio do lado do Twilio — não precisamos manter nenhuma tabela própria
// pra isso (ver migration 0022, que derruba a phone_verifications que a
// tentativa anterior com Zenvia tinha criado).
//
// Configure com:
//   supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
//   supabase secrets set TWILIO_AUTH_TOKEN=seu-auth-token
//   supabase secrets set TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxx
//
// Formato conferido no conhecimento geral do modelo sobre a API do Twilio
// Verify (v2), não testado ao vivo — confira contra a documentação atual
// da sua conta se algo não bater.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  phone: string; // E.164, ex: +5511999999999
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!accountSid || !authToken || !verifyServiceSid) {
      return new Response(JSON.stringify({ error: "Credenciais do Twilio não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    if (!body.phone || !/^\+\d{10,15}$/.test(body.phone)) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    const twilioResponse = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: body.phone, Channel: "sms" }),
    });

    const result = await twilioResponse.json();

    if (!twilioResponse.ok) {
      // 60203 = limite de reenvio atingido do lado do Twilio — não é bem
      // um erro, só pede pra esperar um pouco.
      if (result.code === 60203) {
        return new Response(JSON.stringify({ cooldownMs: 60 * 1000 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(result.message ?? "Erro ao enviar código");
    }

    return new Response(JSON.stringify({ cooldownMs: 30 * 1000 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
