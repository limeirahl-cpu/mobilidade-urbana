import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";

export default function DriverLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session || !profile || profile.role !== "driver") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
