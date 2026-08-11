import { useEffect, useRef } from "react";
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

import { colors } from "@/theme/colors";
import type { Profile } from "@/types/database";

const DRAWER_WIDTH = Math.min(300, Dimensions.get("window").width * 0.78);

interface DriverSideMenuProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSelectProfile: () => void;
  onSelectDocuments: () => void;
  onSelectEarnings: () => void;
  onSelectHistory: () => void;
  onSignOut: () => void;
}

export function DriverSideMenu({
  visible,
  profile,
  onClose,
  onSelectProfile,
  onSelectDocuments,
  onSelectEarnings,
  onSelectHistory,
  onSignOut,
}: DriverSideMenuProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      translateX.setValue(-DRAWER_WIDTH);
    }
  }, [visible, translateX]);

  const verificationLabel =
    profile?.verification_status === "approved"
      ? "Verificado"
      : profile?.verification_status === "rejected"
        ? "Rejeitado"
        : "Pendente";
  const verificationColor =
    profile?.verification_status === "approved"
      ? colors.success
      : profile?.verification_status === "rejected"
        ? colors.danger
        : colors.textSecondary;

  function handle(action: () => void) {
    onClose();
    action();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() ?? "?"}</Text>
            </View>
            <Text style={styles.name}>{profile?.full_name}</Text>
            {profile?.rating_avg != null && <Text style={styles.rating}>★ {profile.rating_avg.toFixed(1)}</Text>}
          </View>

          <View style={styles.items}>
            <TouchableOpacity style={styles.item} onPress={() => handle(onSelectProfile)}>
              <Text style={styles.itemText}>Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => handle(onSelectDocuments)}>
              <Text style={styles.itemText}>Verificação</Text>
              <Text style={[styles.badge, { color: verificationColor }]}>{verificationLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => handle(onSelectEarnings)}>
              <Text style={styles.itemText}>Ganhos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => handle(onSelectHistory)}>
              <Text style={styles.itemText}>Histórico</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.signOutButton} onPress={() => handle(onSignOut)}>
              <Text style={styles.signOutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: colors.white,
    paddingTop: 56,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  header: { alignItems: "center", gap: 6, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "800", color: colors.black },
  name: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  rating: { fontSize: 13, color: colors.textSecondary },
  items: { paddingTop: 12, gap: 4, flex: 1 },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  itemText: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  badge: { fontSize: 12, fontWeight: "700" },
  footer: { paddingBottom: 32 },
  signOutButton: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  signOutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
