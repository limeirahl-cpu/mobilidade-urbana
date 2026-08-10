import { supabase } from "@/services/supabase";
import type { Profile, UserRole } from "@/types/database";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

interface CreateProfileInput {
  id: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  vehicleInfo?: string;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: input.id,
      role: input.role,
      full_name: input.fullName,
      phone: input.phone ?? null,
      vehicle_info: input.vehicleInfo ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.role === "driver") {
    const { error: statusError } = await supabase
      .from("driver_status")
      .insert({ driver_id: input.id, is_online: false });
    if (statusError) throw statusError;
  }

  return data;
}
