const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface Point {
  lat: number;
  lng: number;
}

export interface AddressResult {
  label: string;
  placeId: string;
}

/** Google Places Autocomplete — resultados leves (sem lat/lng ainda) pra
 * mostrar enquanto o usuário digita. Chame `resolvePlaceDetails` com o
 * `placeId` só quando ele tocar numa sugestão específica. */
export async function searchAddress(query: string, near?: Point): Promise<AddressResult[]> {
  if (!GOOGLE_MAPS_KEY || !query.trim()) return [];

  const params = new URLSearchParams({
    input: query,
    language: "pt-BR",
    components: "country:br",
    key: GOOGLE_MAPS_KEY,
  });
  if (near) {
    params.set("location", `${near.lat},${near.lng}`);
    params.set("radius", "50000");
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const predictions = json.predictions ?? [];
    return predictions.map((p: { description: string; place_id: string }) => ({
      label: p.description,
      placeId: p.place_id,
    }));
  } catch {
    return [];
  }
}

/** Resolve as coordenadas de uma sugestão do Places Autocomplete. */
export async function resolvePlaceDetails(placeId: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_KEY) return null;

  const params = new URLSearchParams({ place_id: placeId, fields: "geometry", key: GOOGLE_MAPS_KEY });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const location = json.result?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}

/** Reverse geocoding via Google — turns a point into a human-readable address. */
export async function reverseGeocode(point: Point): Promise<string | null> {
  if (!GOOGLE_MAPS_KEY) return null;

  const params = new URLSearchParams({
    latlng: `${point.lat},${point.lng}`,
    language: "pt-BR",
    key: GOOGLE_MAPS_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}
