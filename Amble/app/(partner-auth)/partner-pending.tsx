import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { partnerAuthAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

export default function PartnerPendingScreen() {
  const router = useRouter();
  const { partner, logout } = usePartnerAuthStore();
  const [status, setStatus] = useState<"loading" | "paid_pending" | "pending" | "active" | "unknown">("loading");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await partnerAuthAPI.getMe();
        const p = res.data?.partner;
        if (p?.subscriptionStatus === "active") {
          router.replace("/dashboard");
          return;
        }
        setStatus(p?.subscriptionStatus === "paid_pending" ? "paid_pending" : "pending");
      } catch {
        setStatus("unknown");
      }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, []);

  if (partner?.subscriptionStatus === "active") {
    router.replace("/dashboard");
    return null;
  }

  const isPaid = status === "paid_pending";

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {status === "loading" ? (
          <ActivityIndicator size="large" color={PRIMARY} />
        ) : (
          <>
            <View style={[s.iconWrap, isPaid && { backgroundColor: "#F0FDF4" }]}>
              <Ionicons
                name={isPaid ? "checkmark-circle-outline" : "hourglass-outline"}
                size={64}
                color={isPaid ? "#16A34A" : PRIMARY}
              />
            </View>
            <Text style={s.title}>
              {isPaid ? "Thanh toán thành công!" : "Đang chờ duyệt"}
            </Text>
            <Text style={s.subtitle}>
              {isPaid
                ? "Cảm ơn bạn! Khoản thanh toán đã được xác nhận. Tài khoản đang chờ quản trị viên xét duyệt và sẽ kích hoạt trong thời gian sớm nhất."
                : "Tài khoản của bạn đang chờ thanh toán và xét duyệt. Bạn sẽ nhận được thông báo khi được kích hoạt."}
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
          </>
        )}
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
