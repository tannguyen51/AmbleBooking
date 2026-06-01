import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
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

  return (
    <View style={[styles.row, { gap: config.gap }, containerStyle]}>
      <View style={[styles.ring, { width: config.ring, height: config.ring }]}>
        <View style={styles.innerWrap}>
          <Image
            source={require("../assets/images/android-icon-background.png")}
            style={styles.inner}
          />
        </View>
      </View>

      {showText && (
        <Text
          style={[styles.brand, { fontSize: config.text, color: textColor }]}
        >
          Munchmap
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
    width: "100%",
    height: "100%",
    borderRadius: 999,
    resizeMode: "cover",
    position: "absolute",
  },
  innerWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    letterSpacing: 0.2,
    fontFamily: "TAN-NIMBUS",
  },
});
