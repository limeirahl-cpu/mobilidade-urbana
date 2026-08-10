import { useEffect, useState } from "react";

import { fetchDriverStatus } from "@/services/driverStatus";
import { supabase } from "@/services/supabase";
import type { DriverStatus } from "@/types/database";

/** Passenger-side: live-reads a specific driver's `driver_status` row once assigned to a ride. */
export function useDriverStatus(driverId: string | null) {
  const [status, setStatus] = useState<DriverStatus | null>(null);

  useEffect(() => {
    if (!driverId) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    fetchDriverStatus(driverId).then((s) => {
      if (!cancelled) setStatus(s);
    });

    // Unique per mount (not just per driverId): if an old channel with the
    // same name hasn't finished being removed yet (removeChannel is async),
    // Supabase reuses that still-subscribed instance instead of making a
    // new one, and .on() throws on an already-subscribed channel.
    const channel = supabase
      .channel(`driver-status-${driverId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driver_status", filter: `driver_id=eq.${driverId}` },
        (payload) => setStatus(payload.new as DriverStatus)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return status;
}
