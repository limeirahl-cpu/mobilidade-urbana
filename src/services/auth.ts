import * as Crypto from "expo-crypto";

import { supabase } from "@/services/supabase";
import type { Gender, Profile, UserRole } from "@/types/database";

// O login é por telefone + código de verificação (ver src/services/sms.ts,
// mockado por enquanto). O Supabase só recebe uma senha real de e-mail/senha
// depois desse código já ter sido confirmado no app — não existe provedor de
// SMS configurado no Supabase, então usar `phone` como identificador nativo
// (signInWithOtp/verifyOtp) exigiria configurar um (Twilio etc.) primeiro.
//
// Em vez disso, o telefone vira um e-mail sintético determinístico e a senha
// é derivada por hash do próprio telefone — nunca fica visível pro usuário,
// nunca é armazenada em lugar nenhum (é recalculada toda vez a partir do
// número). Isso reaproveita 100% da infraestrutura de sessão/RLS que já
// funciona hoje, sem precisar mexer em nenhuma configuração do Supabase.
// Quando entrar um provedor de SMS real, essa é a única função a trocar.
const PHONE_AUTH_EMAIL_DOMAIN = "phone.urbix.internal";
const PHONE_PASSWORD_SALT = "urbix-phone-auth-v1";

function phoneToSyntheticEmail(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

async function derivePasswordFromPhone(phoneE164: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${PHONE_PASSWORD_SALT}:${phoneE164}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export async function signInOrSignUpWithPhone(phoneE164: string): Promise<{ isNewAccount: boolean }> {
  const email = phoneToSyntheticEmail(phoneE164);
  const password = await derivePasswordFromPhone(phoneE164);

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError) return { isNewAccount: false };

  const { error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) throw signUpError;
  return { isNewAccount: true };
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
  gender?: Gender;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: input.id,
      role: input.role,
      full_name: input.fullName,
      phone: input.phone ?? null,
      phone_verified: !!input.phone,
      vehicle_info: input.vehicleInfo ?? null,
      category_id: input.categoryId ?? null,
      gender: input.gender ?? null,
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
  email?: string;
  avatarUrl?: string;
  categoryId?: string;
  gender?: Gender;
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email || null;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.gender !== undefined) patch.gender = input.gender;

  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
