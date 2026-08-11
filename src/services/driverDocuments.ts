import { supabase } from "@/services/supabase";

export type DriverDocumentKind = "cnh" | "vehicle_document" | "vehicle_photo";

const COLUMN_BY_KIND: Record<DriverDocumentKind, string> = {
  cnh: "cnh_photo_url",
  vehicle_document: "vehicle_document_url",
  vehicle_photo: "vehicle_photo_url",
};

/** Bucket privado (0017) — guarda só o caminho do arquivo, não uma URL
 * pública (o bucket `avatars`, esse sim público, usa getPublicUrl; aqui não
 * dá, e não deveria: documento de motorista não é pra qualquer um ler). */
export async function uploadDriverDocument(
  userId: string,
  kind: DriverDocumentKind,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${userId}/${kind}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("driver-documents")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [COLUMN_BY_KIND[kind]]: path })
    .eq("id", userId);
  if (updateError) throw updateError;

  return path;
}

/** Marca a verificação como pendente de novo (cobre reenvio depois de uma
 * rejeição) e grava a placa informada. Aprovação continua manual, via SQL
 * Editor — sem painel admin no projeto ainda. */
export async function submitForVerification(userId: string, vehiclePlate: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ vehicle_plate: vehiclePlate, verification_status: "pending" })
    .eq("id", userId);
  if (error) throw error;
}
