import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { signIn } from "@/services/auth";
import { colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errors";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (err) {
      Alert.alert("Erro ao entrar", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandHeader}>
        {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
        <Image source={require("../../assets/urbix-mark-transparent.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandName}>Urbix</Text>
        <Text style={styles.brandSlogan}>Mobilidade que conecta</Text>
      </View>

      <Text style={styles.title}>Entrar</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      >
        {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>
      <Link href="/(auth)/sign-up" style={styles.link}>
        <Text>Não tem conta? Cadastre-se</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  brandHeader: { alignItems: "center", marginBottom: 24 },
  logo: { width: 88, height: 72, marginBottom: 8 },
  brandName: { fontSize: 30, fontWeight: "800", color: colors.textPrimary, letterSpacing: 0.5 },
  brandSlogan: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, color: colors.textPrimary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: colors.brandOrange, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  link: { marginTop: 16, alignSelf: "center" },
});
