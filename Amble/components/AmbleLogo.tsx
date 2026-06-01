import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type LogoSize = "sm" | "md" | "lg" | "xl";

type SizeConfig = {
  ring: number;
  text: number;
  gap: number;
  letterScale: number;
};

const SIZES: Record<LogoSize, SizeConfig> = {
  sm: { ring: 24, text: 15, gap: 5, letterScale: 0.5 },
  md: { ring: 34, text: 20, gap: 7, letterScale: 0.48 },
  lg: { ring: 42, text: 25, gap: 8, letterScale: 0.47 },
  xl: { ring: 60, text: 34, gap: 10, letterScale: 0.46 },
};

interface MunchMapLogoProps {
  size?: LogoSize;
  showText?: boolean;
  textColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function MunchMapLogo({
  size = "md",
  showText = true,
  textColor = "#FFFFFF",
  containerStyle,
}: MunchMapLogoProps) {
  const config = SIZES[size];
  const letterSize = Math.round(config.ring * config.letterScale);

  return (
    <View style={[styles.row, { gap: config.gap }, containerStyle]}>
      <View style={[styles.ring, { width: config.ring, height: config.ring }]}>
        <LinearGradient
          colors={["#FF6B35", "#FFD700", "#FF6B9D", "#6B4FFF", "#00D2FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          <Text style={[styles.letter, { fontSize: letterSize }]}>M</Text>
        </LinearGradient>
      </View>

      {showText && (
        <Text
          style={[styles.brand, { fontSize: config.text, color: textColor }]}
        >
          munchmap
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
  inner: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  brand: {
    letterSpacing: 0.2,
    fontFamily: "TAN-NIMBUS",
  },
});
