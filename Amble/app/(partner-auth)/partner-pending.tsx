import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";

const PRIMARY = "#FF6B35";

export default function PartnerPendingScreen() {
  const router = useRouter();
  const { partner, logout } = usePartnerAuthStore();

  const isApproved = partner?.subscriptionStatus === "active";

  if (isApproved) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name="hourglass-outline" size={64} color={PRIMARY} />
        </View>
        <Text style={s.title}>Đang chờ duyệt</Text>
        <Text style={s.subtitle}>
          Tài khoản của bạn đã được tạo và đang chờ quản trị viên xét duyệt.
          Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.
        </Text>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>{partner?.ownerName || "—"}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>{partner?.restaurantName || "—"}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>{partner?.email || "—"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace("/welcome");
          }}
        >
          <Text style={s.logoutText}>Quay lại trang chủ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#FFF3ED", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#1A1A1A", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  infoCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, width: "100%",
    borderWidth: 1, borderColor: "#E5E7EB", gap: 10, marginBottom: 24,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 14, color: "#374151", fontWeight: "600" },
  logoutBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  logoutText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});
