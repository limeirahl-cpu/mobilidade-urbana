import { useEffect, useState } from "react";

import { supabase } from "@/services/supabase";
import { fetchOpenRideRequests } from "@/services/rides";
import type { Ride } from "@/types/database";

/** Live list of open (`status='requested'`) rides in the driver's own category, for a driver browsing the pool. */
export function useIncomingRideRequests(enabled: boolean, categoryId: string | null) {
  const [requests, setRequests] = useState<Ride[]>([]);

  useEffect(() => {
    if (!enabled || !categoryId) {
      setRequests([]);
      return;
    }

    let cancelled = false;
    fetchOpenRideRequests(categoryId).then((rides) => {
      if (!cancelled) setRequests(rides);
    });

    const channel = supabase
      .channel("open-ride-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.requested" },
        (payload) => {
          const ride = payload.new as Ride;
          if (ride.category_id !== categoryId) return;
          setRequests((prev) => (prev.some((r) => r.id === ride.id) ? prev : [...prev, ride]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const ride = payload.new as Ride;
          // Once a ride leaves the open pool (accepted/cancelled elsewhere), drop it from the list.
          setRequests((prev) =>
            ride.status === "requested" ? prev : prev.filter((r) => r.id !== ride.id)
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, categoryId]);

  return requests;
}
