import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { signInOrSignUpWithPhone } from "@/services/auth";
import { sendVerificationCode, verifyCode, type VerifyCodeFailureReason } from "@/services/sms";
import { colors } from "@/theme/colors";
import { formatBRPhoneInput, isValidBRPhone, toE164BR } from "@/utils/phone";
import { getErrorMessage } from "@/utils/errors";

type Step = "phone" | "otp";

function otpFailureMessage(reason: VerifyCodeFailureReason): string {
  switch (reason) {
    case "expired":
      return "Código expirado. Toque em \"Reenviar código\".";
    case "too_many_attempts":
      return "Muitas tentativas. Toque em \"Reenviar código\" pra receber um novo.";
    case "not_requested":
      return "Peça um código antes de confirmar.";
    default:
      return "Código incorreto.";
  }
}

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [otpError, setOtpError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step !== "otp") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [step]);

  const phoneE164 = toE164BR(phoneInput);
  const resendCooldownSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  function requestCode() {
    const { code, cooldownMs } = sendVerificationCode(phoneE164);
    setDevCode(code);
    setResendAvailableAt(Date.now() + cooldownMs);
    setNow(Date.now());
  }

  function handleSendCode() {
    if (!isValidBRPhone(phoneInput)) return;
    setOtp("");
    setOtpError(null);
    requestCode();
    setStep("otp");
  }

  function handleResend() {
    if (resendCooldownSeconds > 0) return;
    setOtp("");
    setOtpError(null);
    requestCode();
  }

  async function handleConfirmCode() {
    setSubmitting(true);
    setOtpError(null);
    try {
      const result = verifyCode(phoneE164, otp);
      if (!result.ok) {
        setOtpError(otpFailureMessage(result.reason));
        return;
      }

      const { isNewAccount } = await signInOrSignUpWithPhone(phoneE164);
      if (isNewAccount) {
        router.replace({ pathname: "/(auth)/role-select", params: { phone: phoneE164 } });
      } else {
        router.replace("/");
      }
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

      {step === "phone" ? (
        <>
          <Text style={styles.title}>Entrar ou criar conta</Text>
          <Text style={styles.subtitle}>Digite seu telefone. Vamos enviar um código de confirmação.</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 91234-5678"
            keyboardType="phone-pad"
            value={phoneInput}
            onChangeText={(t) => setPhoneInput(formatBRPhoneInput(t))}
            maxLength={16}
          />
          <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={!isValidBRPhone(phoneInput)}>
            <Text style={styles.buttonText}>Enviar código</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Confirme o código</Text>
          <Text style={styles.subtitle}>Enviamos um código para {formatBRPhoneInput(phoneInput)}</Text>

          <View style={styles.devCodeBanner}>
            <Text style={styles.devCodeText}>Modo de teste — código: {devCode}</Text>
          </View>

          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="0000"
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 4))}
            textAlign="center"
          />
          {otpError && <Text style={styles.errorText}>{otpError}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirmCode}
            disabled={submitting || otp.length !== 4}
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Confirmar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={resendCooldownSeconds > 0} style={styles.link}>
            <Text style={resendCooldownSeconds > 0 ? styles.linkTextDisabled : styles.linkText}>
              {resendCooldownSeconds > 0 ? `Reenviar código (${resendCooldownSeconds}s)` : "Reenviar código"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("phone")} style={styles.link}>
            <Text style={styles.linkText}>Trocar número</Text>
          </TouchableOpacity>
        </>
      )}
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
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 },
  otpInput: { fontSize: 22, fontWeight: "800", letterSpacing: 8 },
  devCodeBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandOrange,
    borderRadius: 8,
    padding: 10,
  },
  devCodeText: { color: colors.textPrimary, fontWeight: "700", textAlign: "center" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  button: { backgroundColor: colors.brandOrange, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  link: { marginTop: 8, alignSelf: "center" },
  linkText: { color: colors.textPrimary, fontWeight: "600" },
  linkTextDisabled: { color: colors.textSecondary, fontWeight: "600" },
});
