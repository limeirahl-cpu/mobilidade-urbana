import type { RideCategory } from "@/types/database";

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function estimateFareForCategory(
  category: RideCategory,
  distanceKm: number,
  durationMin: number
): number {
  const fare =
    (category.base_fare + distanceKm * category.per_km_rate + durationMin * category.per_min_rate) *
    category.surge_multiplier;
  return Math.max(fare, category.min_fare);
}
