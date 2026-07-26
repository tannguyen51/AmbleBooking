import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  { name: "dashboard", label: "Tổng quan", icon: "home-outline" },
  { name: "partners", label: "Đối tác", icon: "business-outline" },
  { name: "analytics", label: "Phân tích", icon: "stats-chart-outline" },
  { name: "vouchers", label: "Voucher", icon: "pricetag-outline" },
  { name: "bookings", label: "Doanh thu", icon: "receipt-outline" },
];

export function AdminBottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[1] || "dashboard";

  return (
    <View style={s.wrapper}>
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
              <Ionicons name={tab.icon as any} size={24} color={isActive ? "#3A3A3A" : "#898887"} />
              <Text style={[s.label, isActive && s.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    height: 58,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    width: "90%",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 9, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#898887", marginTop: 2 },
  labelActive: { color: "#3A3A3A" },
});
