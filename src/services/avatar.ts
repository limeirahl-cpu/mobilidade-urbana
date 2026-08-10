import { supabase } from "@/services/supabase";

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
