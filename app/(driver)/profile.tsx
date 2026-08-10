import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { colors } from "@/theme/colors";

export default function DriverProfile() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileEditor />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
  },
  back: { color: colors.textPrimary, fontWeight: "600", width: 60 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  content: { padding: 16, gap: 20 },
});
