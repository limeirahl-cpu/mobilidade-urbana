import { supabase } from "@/services/supabase";

/** Upload via FormData com `{ uri, name, type }`, não `fetch(uri).blob()` —
 * o Blob que o fetch produz em React Native (sobretudo Android) não carrega
 * os bytes binários de forma confiável pro upload do Supabase Storage: a
 * chamada não dá erro, mas o arquivo grava vazio/corrompido. FormData com
 * esse formato é a própria extensão nativa do React Native pra upload de
 * arquivo (RN reconhece o objeto {uri,name,type} e lê o arquivo local de
 * verdade), e é o padrão recomendado pela documentação do Supabase pra RN. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const formData = new FormData();
  // TS resolve FormData pelo lib "dom" (só aceita Blob/string) mesmo em RN,
  // que aceita nativamente esse formato {uri,name,type} — cast necessário,
  // o comportamento em runtime é o do FormData do React Native.
  formData.append("file", { uri: localUri, name: "avatar.jpg", type: "image/jpeg" } as unknown as Blob);

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, formData, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
