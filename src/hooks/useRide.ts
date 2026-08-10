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

    const channel = supabase
      .channel(`ride-${rideId}`)
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
