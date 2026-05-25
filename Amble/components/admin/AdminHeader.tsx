import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { adminTheme } from "../../constants/adminTheme";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function AdminHeader({ title, subtitle, showBack = true }: AdminHeaderProps) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[adminTheme.colors.primary, adminTheme.colors.primaryContainer]}
      style={styles.container}
    >
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />
      {showBack ? (
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/admin/dashboard");
          }}
        >
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: 100,
    paddingTop: 22,
    paddingBottom: 14,
    backgroundColor: adminTheme.colors.primary,
    overflow: "hidden",
  },
  decorTopRight: {
    position: "absolute",
    top: -22,
    right: -14,
    width: 120,
    height: 70,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.26)",
    transform: [{ rotate: "-8deg" }],
  },
  decorBottomLeft: {
    position: "absolute",
    left: -18,
    bottom: -24,
    width: 110,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "9deg" }],
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    zIndex: 2,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.74)",
    marginTop: 4,
    fontWeight: "500",
    lineHeight: 17,
  },
});
