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
  categoryId?: string;
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
      category_id: input.categoryId ?? null,
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

interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  categoryId?: string;
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;

  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
