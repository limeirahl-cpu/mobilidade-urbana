export type UserRole = "passenger" | "driver";

export type RideStatus =
  | "requested"
  | "accepted"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface RideCategory {
  id: string;
  key: string;
  label: string;
  base_fare: number;
  per_km_rate: number;
  per_min_rate: number;
  min_fare: number;
  surge_multiplier: number;
  active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  vehicle_info: string | null;
  category_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  avatar_url: string | null;
  created_at: string;
}

export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  lat: number;
  lng: number;
  address_text: string | null;
  created_at: string;
}

export interface FavoriteDriver {
  passenger_id: string;
  driver_id: string;
  created_at: string;
}

export interface RideRating {
  ride_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface DriverStatus {
  driver_id: string;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  heading: number | null;
  updated_at: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  category_id: string;
  status: RideStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  estimated_distance_km: number | null;
  estimated_duration_min: number | null;
  estimated_fare: number | null;
  coupon_id: string | null;
  discount_amount: number | null;
  payment_method: string | null;
  requested_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
}
