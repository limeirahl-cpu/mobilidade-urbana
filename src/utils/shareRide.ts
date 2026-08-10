import type { Profile, Ride, RideCategory } from "@/types/database";

export function buildShareMessage(
  ride: Ride,
  driverProfile: Profile | null,
  category: RideCategory | null
): string {
  const lines = ["Estou numa corrida, acompanhe:"];

  if (category) lines.push(`Categoria: ${category.label}`);
  if (driverProfile) {
    lines.push(`Motorista: ${driverProfile.full_name}`);
    if (driverProfile.vehicle_info) lines.push(`Veículo: ${driverProfile.vehicle_info}`);
  }

  lines.push(`Embarque: ${ride.pickup_lat.toFixed(4)}, ${ride.pickup_lng.toFixed(4)}`);
  lines.push(`Destino: ${ride.dropoff_lat.toFixed(4)}, ${ride.dropoff_lng.toFixed(4)}`);
  if (ride.estimated_fare != null) lines.push(`Tarifa estimada: R$ ${ride.estimated_fare.toFixed(2)}`);

  return lines.join("\n");
}
