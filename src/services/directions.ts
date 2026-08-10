import { decodePolyline, type LatLngPoint } from "@/utils/polyline";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface Point {
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
  coordinates: LatLngPoint[];
}

/** Real driving route via Google Directions API. Returns null on failure so callers can fall back to a straight-line estimate. */
export async function getRoute(pickup: Point, dropoff: Point): Promise<RouteEstimate | null> {
  if (!GOOGLE_MAPS_KEY) return null;

  const params = new URLSearchParams({
    origin: `${pickup.lat},${pickup.lng}`,
    destination: `${dropoff.lat},${dropoff.lng}`,
    mode: "driving",
    language: "pt-BR",
    key: GOOGLE_MAPS_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const route = json.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg) return null;

    return {
      distanceKm: leg.distance.value / 1000,
      durationMin: leg.duration.value / 60,
      coordinates: route.overview_polyline?.points ? decodePolyline(route.overview_polyline.points) : [],
    };
  } catch {
    return null;
  }
}
