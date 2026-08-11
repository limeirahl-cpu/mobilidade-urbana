// Edge Function — gera um código de 4 dígitos, grava em phone_verifications
// (nunca devolvido pro cliente) e manda via SMS de verdade pela API da
// Zenvia. Sem sessão de usuário ainda nesse ponto do fluxo (login por
// telefone acontece antes de existir conta) — só precisa da apikey/anon
// key que o supabase-js já manda sozinho em toda chamada.
//
// Configure com:
//   supabase secrets set ZENVIA_API_TOKEN=seu-token-aqui
//
// Formato da API da Zenvia (v2/channels/sms) conferido no conhecimento
// geral do modelo, não testado ao vivo — se a Zenvia tiver mudado algo,
// ajuste aqui conforme a documentação atual da conta.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_LENGTH = 4;
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

interface RequestBody {
  phone: string; // E.164, ex: +5511999999999
}

function generateCode(): string {
  return Math.floor(Math.random() * 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const zenviaToken = Deno.env.get("ZENVIA_API_TOKEN");
    if (!zenviaToken) {
      return new Response(JSON.stringify({ error: "ZENVIA_API_TOKEN não configurado" }), {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await adminClient
      .from("phone_verifications")
      .select("last_sent_at")
      .eq("phone", body.phone)
      .maybeSingle();

    const now = Date.now();
    if (existing) {
      const elapsed = now - new Date(existing.last_sent_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return new Response(JSON.stringify({ cooldownMs: RESEND_COOLDOWN_MS - elapsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const code = generateCode();
    const { error: upsertError } = await adminClient.from("phone_verifications").upsert({
      phone: body.phone,
      code,
      expires_at: new Date(now + CODE_TTL_MS).toISOString(),
      attempts: 0,
      last_sent_at: new Date(now).toISOString(),
    });
    if (upsertError) throw upsertError;

    const zenviaResponse = await fetch("https://api.zenvia.com/v2/channels/sms/messages", {
      method: "POST",
      headers: {
        "X-API-TOKEN": zenviaToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Urbix",
        to: body.phone.replace("+", ""),
        contents: [{ type: "text", text: `Seu código de verificação Urbix: ${code}` }],
      }),
    });

    if (!zenviaResponse.ok) {
      const errText = await zenviaResponse.text();
      throw new Error(`Zenvia: ${errText}`);
    }

    return new Response(JSON.stringify({ cooldownMs: RESEND_COOLDOWN_MS }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
