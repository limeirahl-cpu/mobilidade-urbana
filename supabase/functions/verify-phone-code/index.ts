// Edge Function — confere o código digitado via Twilio Verify Check. O
// Twilio já sabe qual é o código certo pro telefone (gerado por ele mesmo
// no send-verification-code) — a gente só repassa a checagem.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  phone: string;
  code: string;
}

type FailureReason = "not_requested" | "expired" | "too_many_attempts" | "invalid";

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
    if (!body.phone || !body.code) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    function respond(ok: boolean, reason?: FailureReason) {
      return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    const twilioResponse = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: body.phone, Code: body.code }),
      }
    );

    const result = await twilioResponse.json();

    if (!twilioResponse.ok) {
      // 20404 = nenhuma verificação pendente pra esse número (nunca pediu
      // ou já expirou — o Twilio não distingue os dois casos).
      if (result.code === 20404) return respond(false, "expired");
      // 60202 = limite de tentativas de checagem atingido do lado do Twilio.
      if (result.code === 60202) return respond(false, "too_many_attempts");
      throw new Error(result.message ?? "Erro ao verificar código");
    }

    if (result.status === "approved") return respond(true);
    return respond(false, "invalid");
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
