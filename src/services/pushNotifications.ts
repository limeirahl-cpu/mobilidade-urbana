import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { supabase } from "@/services/supabase";

/** Pede permissão (se ainda não tiver) e salva o token de push do Expo em
 * driver_status — é o que a Edge Function notify-drivers-new-ride usa pra
 * avisar de corrida nova mesmo com o app em segundo plano. Silenciosa em
 * simulador (não recebe push de verdade) e se a permissão for negada. */
export async function registerAndSavePushToken(driverId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  const { error } = await supabase
    .from("driver_status")
    .update({ push_token: tokenResponse.data })
    .eq("driver_id", driverId);
  if (error) throw error;
}
