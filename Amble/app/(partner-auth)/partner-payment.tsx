import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { partnerAuthAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

export default function PartnerPaymentScreen() {
  const router = useRouter();
  const { checkoutUrl } = useLocalSearchParams<{ checkoutUrl: string }>();
  const { partner } = usePartnerAuthStore();
  const [status, setStatus] = useState<"opening" | "waiting" | "paid" | "failed">("opening");

  // Mở PayOS khi vào screen
  useEffect(() => {
    if (checkoutUrl) {
      Linking.openURL(checkoutUrl).catch(() => {});
      setStatus("waiting");
    } else {
      setStatus("failed");
    }
  }, [checkoutUrl]);

  // Poll subscriptionStatus
  useEffect(() => {
    if (status !== "waiting") return;
    const timer = setInterval(async () => {
      try {
        const res = await partnerAuthAPI.getMe();
        const p = res.data?.partner;
        if (p?.subscriptionStatus === "paid_pending") {
          setStatus("paid");
          clearInterval(timer);
          setTimeout(() => {
            router.replace("/(partner-auth)/partner-pending");
          }, 1500);
        } else if (p?.subscriptionStatus === "active") {
          clearInterval(timer);
          router.replace("/dashboard");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [status]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {status === "opening" || status === "waiting" ? (
          <>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={s.title}>Đang chờ thanh toán</Text>
            <Text style={s.subtitle}>
              Vui lòng hoàn tất thanh toán qua PayOS.{ "\n" }
              Trang này sẽ tự động cập nhật khi thanh toán thành công.
            </Text>
            <Text style={s.note}>Đang kiểm tra trạng thái thanh toán...</Text>
          </>
        ) : status === "paid" ? (
          <>
            <View style={[s.iconWrap, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>
            <Text style={s.title}>Thanh toán thành công!</Text>
            <Text style={s.subtitle}>
              Cảm ơn bạn! Đang chuyển đến trang chờ duyệt...
            </Text>
          </>
        ) : (
          <>
            <View style={[s.iconWrap, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <Text style={s.title}>Không thể mở thanh toán</Text>
            <Text style={s.subtitle}>
              Vui lòng thử lại hoặc liên hệ hỗ trợ.
            </Text>
            <TouchableOpacity
              style={s.btn}
              onPress={() => router.replace("/(partner-auth)/partner-pending")}
            >
              <Text style={s.btnText}>Tiếp tục</Text>
            </TouchableOpacity>
          </>
        )}

        {status === "waiting" && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={async () => {
              const { logout } = usePartnerAuthStore.getState();
              await logout();
              router.replace("/welcome");
            }}
          >
            <Text style={s.cancelText}>Huỷ thanh toán và quay lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#FFF3ED", alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#1A1A1A", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  note: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
  btn: {
    marginTop: 16, backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: { marginTop: 24, padding: 12 },
  cancelText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});
