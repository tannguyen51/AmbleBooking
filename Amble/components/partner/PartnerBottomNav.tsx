import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  {
    name: "dashboard",
    label: "Dashboard",
    icon: "home-outline",
    path: "/dashboard",
  },
  {
    name: "team",
    label: "Nhân sự",
    icon: "people-outline",
    path: "/partner-team",
  },
  {
    name: "tables",
    label: "Bàn",
    icon: "grid-outline",
    path: "/tables",
  },
  {
    name: "orders",
    label: "Đơn",
    icon: "clipboard-outline",
    path: "/orders",
  },
  {
    name: "notifications",
    label: "Thông báo",
    icon: "notifications-outline",
    path: "/notifications",
  },
  {
    name: "profile",
    label: "Cài Đặt",
    icon: "person-circle-outline",
    path: "/profile",
  },
];

interface PartnerBottomNavProps {
  pendingCount?: number;
}

export function PartnerBottomNav({ pendingCount = 0 }: PartnerBottomNavProps) {
  const router = useRouter();
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = currentScreen === tab.name;
        const showBadge = tab.name === "orders" && pendingCount > 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={isActive ? "#fff" : "#6B7280"}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
    backgroundColor: "rgba(255,255,255,0.99)",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 9,
    paddingHorizontal: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 10,
    marginHorizontal: 1,
  },
  tabActive: {
    backgroundColor: "#111827",
  },
  iconWrap: {
    position: "relative",
    marginBottom: 2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
