import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";

const TABS = [
  { name: "dashboard", label: "Tổng Quan", icon: "speedometer" },
  { name: "partners", label: "Đối Tác", icon: "business" },
  { name: "restaurants", label: "Nhà Hàng", icon: "restaurant" },
  { name: "analytics", label: "Phân Tích", icon: "stats-chart" },
  { name: "bookings", label: "Đơn Hàng", icon: "calendar" },
];

export function AdminBottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[1] || "dashboard";

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = current === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => router.push(`/admin/${tab.name}` as any)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={isActive ? adminTheme.colors.onSurface : adminTheme.colors.muted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: adminTheme.colors.outlineVariant,
    backgroundColor: adminTheme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  label: {
    fontSize: 10,
    color: adminTheme.colors.muted,
    fontWeight: "600",
  },
  labelActive: {
    color: adminTheme.colors.onSurface,
  },
});
