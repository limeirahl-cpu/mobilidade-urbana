import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";

export default function PassengerLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session || !profile || profile.role !== "passenger") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
