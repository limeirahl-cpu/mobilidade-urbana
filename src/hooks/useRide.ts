import { useEffect, useState } from "react";

import { supabase } from "@/services/supabase";
import { fetchRide } from "@/services/rides";
import type { Ride } from "@/types/database";

export function useRide(rideId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchRide(rideId).then((r) => {
      if (!cancelled) {
        setRide(r);
        setLoading(false);
      }
    });

    // Unique per mount — see useDriverStatus.ts for why (avoids reusing a
    // same-named channel that's still mid-teardown from a previous mount).
    const channel = supabase
      .channel(`ride-${rideId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => setRide(payload.new as Ride)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  return { ride, loading };
}
