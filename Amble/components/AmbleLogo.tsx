import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type LogoSize = "sm" | "md" | "lg" | "xl";

type SizeConfig = {
  ring: number;
  text: number;
  gap: number;
};

const SIZES: Record<LogoSize, SizeConfig> = {
  sm: { ring: 24, text: 15, gap: 5 },
  md: { ring: 34, text: 20, gap: 7 },
  lg: { ring: 42, text: 25, gap: 8 },
  xl: { ring: 60, text: 34, gap: 10 },
};

interface AmbleLogoProps {
  size?: LogoSize;
  showText?: boolean;
  textColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function AmbleLogo({
  size = "md",
  showText = true,
  textColor = "#FFFFFF",
  containerStyle,
}: AmbleLogoProps) {
  const config = SIZES[size];

  return (
    <View style={[styles.row, { gap: config.gap }, containerStyle]}>
      <View style={[styles.ring, { width: config.ring, height: config.ring }]}>
        <Image
          source={require("../assets/LOGO_MUNCHMAP.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {showText && (
        <Text
          style={[styles.brand, { fontSize: config.text, color: textColor }]}
        >
          Munch Map
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  ring: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brand: {
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
