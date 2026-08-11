import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebView, { WebViewNavigation } from "react-native-webview";

import { colors } from "@/theme/colors";

export const PAYMENT_RETURN_URL = "urbix://payment-return";

interface PaymentCheckoutModalProps {
  visible: boolean;
  initPoint: string | null;
  onReturn: () => void;
  onRequestClose: () => void;
}

export function PaymentCheckoutModal({ visible, initPoint, onReturn, onRequestClose }: PaymentCheckoutModalProps) {
  if (!initPoint) return null;

  function handleShouldStartLoad(request: WebViewNavigation) {
    if (request.url.startsWith(PAYMENT_RETURN_URL)) {
      onReturn();
      return false;
    }
    return true;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onRequestClose}>
          <Text style={styles.close}>✕ Fechar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
        <View style={{ width: 60 }} />
      </View>
      <WebView
        originWhitelist={["*"]}
        source={{ uri: initPoint }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        style={styles.webview}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: { color: colors.textPrimary, fontWeight: "600", width: 60 },
  title: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  webview: { flex: 1 },
});
