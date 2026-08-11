import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

interface AvatarProps {
  uri?: string | null;
  label: string;
  size?: number;
}

/** Foto de perfil com fallback pra um círculo com a inicial — usado em toda
 * tela que mostra alguém (o próprio usuário ou outra parte de uma corrida).
 * Reage sozinho a mudanças de `uri` (recomeça do zero se a imagem falhar de
 * novo) e cai no fallback automaticamente se a URL não carregar. */
export function Avatar({ uri, label, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return <Image source={{ uri }} style={dimensionStyle} onError={() => setFailed(true)} />;
  }

  return (
    <View style={[styles.placeholder, dimensionStyle]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{label.charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.brandGreen, alignItems: "center", justifyContent: "center" },
  initial: { fontWeight: "800", color: colors.black },
});
