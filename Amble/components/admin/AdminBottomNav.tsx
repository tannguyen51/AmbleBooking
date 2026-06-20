import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  { name: "dashboard", label: "Tổng quan", icon: "home-outline" },
  { name: "partners", label: "Quản lý đối tác", icon: "business-outline" },
  { name: "analytics", label: "Phân tích", icon: "stats-chart-outline" },
  { name: "bookings" as any, label: "Quản lí đơn", icon: "receipt-outline" },
];

export function AdminBottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[1] || "dashboard";

  return (
    <View style={s.container}>
      {TABS.map((tab) => {
        const isActive = current === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.tab}
            onPress={() => router.push(`/admin/${tab.name}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon as any} size={20} color={isActive ? "#FF8F1F" : "#9CA3AF"} />
            <Text style={[s.label, isActive && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: "row", backgroundColor: "#FFFFFF", paddingTop: 8, paddingBottom: 24, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  label: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#9CA3AF", marginTop: 2 },
  labelActive: { color: "#FF8F1F" },
});
