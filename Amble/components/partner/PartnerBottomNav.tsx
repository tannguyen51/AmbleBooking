import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  { name: "dashboard", label: "Trang chủ", icon: "home", path: "/dashboard" },
  { name: "tables", label: "Quản lý bàn", icon: "grid-outline", path: "/tables" },
  { name: "orders", label: "Đơn", icon: "list-outline", path: "/orders" },
  { name: "profile", label: "Hồ sơ", icon: "person", path: "/profile" },
];

interface PartnerBottomNavProps { pendingCount?: number; }

export function PartnerBottomNav({ pendingCount = 0 }: PartnerBottomNavProps) {
  const router = useRouter();
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  return (
    <View style={s.wrapper}>
      <View style={s.container}>
        {TABS.map((tab) => {
          const isActive = currentScreen === tab.name;
          const showBadge = tab.name === "orders" && pendingCount > 0;
          return (
            <TouchableOpacity key={tab.name} style={s.tab} onPress={() => router.push(tab.path as any)} activeOpacity={0.7}>
              <View style={s.iconWrap}>
                <Ionicons name={tab.icon as any} size={22} color={isActive ? "#3A3A3A" : "#898887"} />
                {showBadge && (
                  <View style={s.badge}><Text style={s.badgeText}>{pendingCount > 9 ? "9+" : pendingCount}</Text></View>
                )}
              </View>
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
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 13, height: 58,
    paddingHorizontal: 8, paddingBottom: Platform.OS === "ios" ? 0 : 6, paddingTop: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
    width: "90%",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { position: "relative", marginBottom: 2 },
  badge: {
    position: "absolute", top: -4, right: -6, backgroundColor: "#EF4444",
    borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  label: { fontSize: 9, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#898887" },
  labelActive: { color: "#3A3A3A" },
});
