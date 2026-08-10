const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

interface Point {
  lat: number;
  lng: number;
}

export interface AddressResult {
  label: string;
  lat: number;
  lng: number;
}

/** Forward geocoding via Mapbox — turns a typed address into candidate points. */
export async function searchAddress(query: string, near?: Point): Promise<AddressResult[]> {
  if (!MAPBOX_TOKEN || !query.trim()) return [];

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    language: "pt",
    limit: "5",
  });
  if (near) params.set("proximity", `${near.lng},${near.lat}`);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const features = json.features ?? [];
    return features.map((f: { place_name: string; center: [number, number] }) => ({
      label: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    }));
  } catch {
    return [];
  }
}
