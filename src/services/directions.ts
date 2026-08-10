const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

interface Point {
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
}

/** Real driving route via Mapbox Directions API. Returns null on failure so callers can fall back to a straight-line estimate. */
export async function getRoute(pickup: Point, dropoff: Point): Promise<RouteEstimate | null> {
  if (!MAPBOX_TOKEN) return null;

  const coords = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?alternatives=false&overview=false&access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) return null;
    return { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch {
    return null;
  }
}
