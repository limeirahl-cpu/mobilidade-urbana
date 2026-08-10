import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { colors } from "@/theme/colors";

interface RideBottomSheetProps {
  index: number;
  snapPoints: (string | number)[];
  onChangeIndex: (index: number) => void;
  children: ReactNode;
  enablePanDownToClose?: boolean;
}

/** Shared chrome (rounded top, drag handle, shadow) for the sheets that sit over the full-screen map. */
export function RideBottomSheet({
  index,
  snapPoints,
  onChangeIndex,
  children,
  enablePanDownToClose = false,
}: RideBottomSheetProps) {
  return (
    <BottomSheet
      index={index}
      snapPoints={snapPoints}
      onChange={onChangeIndex}
      enablePanDownToClose={enablePanDownToClose}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>{children}</BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
});
