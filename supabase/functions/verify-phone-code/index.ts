// Edge Function — confere o código digitado contra o que está gravado em
// phone_verifications (service role, cliente não tem select nenhum ali).
// Consome a linha ao validar com sucesso, pra não deixar reusar o mesmo
// código depois.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

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
    const body: RequestBody = await req.json();
    if (!body.phone || !body.code) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    function result(ok: boolean, reason?: FailureReason) {
      return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pending } = await adminClient
      .from("phone_verifications")
      .select("*")
      .eq("phone", body.phone)
      .maybeSingle();

    if (!pending) return result(false, "not_requested");

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await adminClient.from("phone_verifications").delete().eq("phone", body.phone);
      return result(false, "expired");
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await adminClient.from("phone_verifications").delete().eq("phone", body.phone);
      return result(false, "too_many_attempts");
    }

    if (pending.code !== body.code) {
      await adminClient
        .from("phone_verifications")
        .update({ attempts: pending.attempts + 1 })
        .eq("phone", body.phone);
      return result(false, "invalid");
    }

    await adminClient.from("phone_verifications").delete().eq("phone", body.phone);
    return result(true);
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
