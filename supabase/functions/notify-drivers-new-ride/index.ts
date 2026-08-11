// Edge Function — dispara push notification (via Expo Push API) pros
// motoristas online da categoria de uma corrida nova. Chamada pelo próprio
// cliente logo depois de createRide() (fire-and-forget, sem bloquear o
// fluxo se a notificação falhar) — ver src/services/rides.ts.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  rideId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    if (!body.rideId) {
      return new Response(JSON.stringify({ error: "rideId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: ride, error: rideError } = await adminClient
      .from("rides")
      .select("id, category_id, pickup_address, passenger_id")
      .eq("id", body.rideId)
      .single();
    if (rideError || !ride) throw rideError ?? new Error("Corrida não encontrada");

    // Só o próprio passageiro da corrida pode disparar a notificação dela.
    if (ride.passenger_id !== user.id) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: eligibleDrivers, error: profilesError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "driver")
      .eq("category_id", ride.category_id)
      .eq("verification_status", "approved");
    if (profilesError) throw profilesError;

    const driverIds = (eligibleDrivers ?? []).map((d) => d.id);
    if (driverIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: statuses, error: statusError } = await adminClient
      .from("driver_status")
      .select("push_token")
      .in("driver_id", driverIds)
      .eq("is_online", true)
      .not("push_token", "is", null);
    if (statusError) throw statusError;

    const tokens = (statuses ?? []).map((s) => s.push_token as string).filter(Boolean);
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = tokens.map((to) => ({
      to,
      title: "Nova corrida disponível",
      body: ride.pickup_address ? `Embarque: ${ride.pickup_address}` : "Toque para ver os detalhes",
      data: { rideId: ride.id },
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ sent: tokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
