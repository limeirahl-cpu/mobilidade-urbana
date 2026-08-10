import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { upsertLocation } from "@/services/driverStatus";
import { DRIVER_LOCATION_DISTANCE_INTERVAL_M, DRIVER_LOCATION_TIME_INTERVAL_MS } from "@/utils/constants";

/** Watches device GPS and pushes it to `driver_status` while `active` is true. */
export function useDriverLocation(driverId: string | null, active: boolean) {
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!active || !driverId) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permissão de localização negada.");
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: DRIVER_LOCATION_DISTANCE_INTERVAL_M,
          timeInterval: DRIVER_LOCATION_TIME_INTERVAL_MS,
        },
        (loc) => {
          upsertLocation(
            driverId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.heading ?? null
          ).catch((e) => setError(e instanceof Error ? e.message : String(e)));
        }
      );

      if (cancelled) {
        sub.remove();
      } else {
        subscriptionRef.current = sub;
      }
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [active, driverId]);

  return { error };
}
