import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; isUp: boolean }; // trend direction
}

export default function KpiCard({ icon, label, value, color, trend }: KpiCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isUp ? "#16A34A20" : "#DC262620" }]}>
            <Ionicons name={trend.isUp ? "arrow-up" : "arrow-down"} size={11} color={trend.isUp ? "#16A34A" : "#DC2626"} />
            <Text style={[styles.trendText, { color: trend.isUp ? "#16A34A" : "#DC2626" }]}>{Math.abs(trend.value)}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: "#fff" }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    marginBottom: 0,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  trendBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 2 },
  trendText: { fontSize: 10, fontWeight: "700" },
  value: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  label: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
});
