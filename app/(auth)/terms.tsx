import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/theme/colors";

// Texto-modelo genérico — não é aconselhamento jurídico. Revisar com um
// advogado antes de operar de verdade (principalmente as seções de coleta
// de dados sensíveis: documento, localização, foto — LGPD exige isso).
export default function Terms() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Termos e Privacidade</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Termos de Uso</Text>
        <Text style={styles.paragraph}>
          Ao usar o Urbix, você concorda em fornecer informações verdadeiras no cadastro, em manter a segurança da
          sua conta e do seu telefone verificado, e em tratar outros usuários (motoristas e passageiros) com
          respeito. O Urbix é uma plataforma que conecta passageiros e motoristas — a corrida em si é um acordo
          entre as duas partes, mediado pelo preço acordado na negociação dentro do app.
        </Text>
        <Text style={styles.paragraph}>
          Motoristas precisam enviar documentos (CNH, documento do veículo, foto do veículo e placa) e aguardar
          aprovação antes de poder ficar online. Enviar documentos falsos ou de terceiros é motivo de bloqueio
          imediato da conta.
        </Text>
        <Text style={styles.paragraph}>
          O Urbix pode suspender ou encerrar contas que violem estes termos, incluindo comportamento abusivo,
          fraude, ou uso do app pra fins diferentes de transporte legítimo.
        </Text>

        <Text style={styles.sectionTitle}>Política de Privacidade</Text>
        <Text style={styles.paragraph}>
          Coletamos seu nome, telefone, e-mail (opcional), foto de perfil, e — se você for motorista — documento de
          habilitação, documento do veículo e placa, usados exclusivamente para verificação de identidade e
          operação do serviço.
        </Text>
        <Text style={styles.paragraph}>
          Durante uma corrida, compartilhamos sua localização em tempo real com a outra parte envolvida (motorista
          ou passageiro daquela corrida específica) — nunca com terceiros não envolvidos na corrida.
        </Text>
        <Text style={styles.paragraph}>
          Dados de pagamento (Pix/cartão) são processados diretamente pelo Mercado Pago — o Urbix não armazena
          número de cartão nem CVV.
        </Text>
        <Text style={styles.paragraph}>
          Você pode solicitar a exclusão da sua conta e dos seus dados a qualquer momento, conforme a Lei Geral de
          Proteção de Dados (LGPD), entrando em contato pelo suporte do app.
        </Text>
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
  title: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, marginTop: 8 },
  paragraph: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
});
