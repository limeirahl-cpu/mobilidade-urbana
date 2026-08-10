import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile) return <Redirect href="/(auth)/role-select" />;
  if (profile.role === "driver") return <Redirect href="/(driver)/home" />;
  return <Redirect href="/(passenger)/home" />;
}
