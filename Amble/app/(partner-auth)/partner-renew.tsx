import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { paymentAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

type PlanKey = "basic" | "standard";

const PLANS: Array<{
  key: PlanKey;
  title: string;
  subtitle: string;
  fee: string;
  tone: "base" | "standard";
}> = [
  {
    key: "basic",
    title: "Gói cơ bản (Basic)",
    subtitle: "Dành cho nhà hàng mới bắt đầu nhận đặt bàn",
    fee: "Phí khởi tạo 799k · Miễn phí tháng",
    tone: "base",
  },
  {
    key: "standard",
    title: "Gói thông dụng (Standard)",
    subtitle: "Tăng độ phủ và được ưu tiên hiển thị trên trang chủ",
    fee: "Khởi tạo free · 699k/tháng",
    tone: "standard",
  },
];

export default function PartnerRenewScreen() {
  const router = useRouter();
  const { partner, logout } = usePartnerAuthStore();
  const [selected, setSelected] = useState<PlanKey>("standard");
  const [isPaying, setIsPaying] = useState(false);

  const handleRenew = async () => {
    if (!partner?._id || isPaying) return;
    setIsPaying(true);
    try {
      const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "https://amblebooking-production.up.railway.app/api").replace(/\/api$/, "");
      const returnUrl = `${baseUrl}/api/payment/partner/payos-return`;
      const cancelUrl = `${baseUrl}/api/payment/partner/payos-cancel`;

      const res = await paymentAPI.createPartnerUpgradePayosPayment({
        partnerId: partner._id,
        fromPackage: partner.subscriptionPackage || "basic",
        toPackage: selected,
        returnUrl,
        cancelUrl,
      });
      const checkoutUrl = res.data?.checkoutUrl || "";
      if (!checkoutUrl) {
        Alert.alert("Lỗi", "Không tạo được link thanh toán. Vui lòng thử lại.");
        return;
      }
      router.push({
        pathname: "/(partner-auth)/partner-payment" as any,
        params: { checkoutUrl },
      });
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể tạo link thanh toán");
    } finally {
      setIsPaying(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.iconWrap, { backgroundColor: "#FEF2F2" }]}>
          <Ionicons name="time-outline" size={60} color="#EF4444" />
        </View>
        <Text style={s.title}>Tài khoản đã hết hạn</Text>
        <Text style={s.subtitle}>
          Vui lòng gia hạn thêm để tiếp tục sử dụng MunchMap.{"\n"}Dữ liệu của bạn vẫn được giữ nguyên.
        </Text>

        <View style={s.plans}>
          {PLANS.map((plan) => {
            const active = selected === plan.key;
            const isStandard = plan.tone === "standard";
            return (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.9}
                onPress={() => setSelected(plan.key)}
                style={{
                  borderWidth: 2,
                  borderColor: active ? (isStandard ? "#7C3AED" : "#FF8F1F") : "#E8E8E8",
                  borderRadius: 15,
                  padding: 16,
                  backgroundColor: active ? (isStandard ? "#F3E8FF" : "#FFF7ED") : "#FFFFFF",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planTitle}>{plan.title}</Text>
                    <Text style={s.planSubtitle}>{plan.subtitle}</Text>
                  </View>
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                      borderColor: active ? (isStandard ? "#7C3AED" : "#FF8F1F") : "#D1D5DB",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {active && <Ionicons name="checkmark" size={14} color="#FF8F1F" />}
                  </View>
                </View>
                <Text style={s.planFee}>{plan.fee}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.renewBtn, isPaying && { opacity: 0.6 }]}
          onPress={handleRenew}
          disabled={isPaying}
        >
          {isPaying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.renewBtnText}>Gia hạn</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  iconWrap: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: "#FFF3ED", alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#1A1A1A", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21, marginBottom: 24 },
  plans: { width: "100%", gap: 10, marginBottom: 20 },
  planTitle: { fontSize: 16, fontWeight: "700", color: "#202020" },
  planSubtitle: { fontSize: 12, color: "#898887", marginTop: 4 },
  planFee: { fontSize: 14, fontWeight: "700", color: "#202020", marginTop: 10 },
  renewBtn: {
    width: "100%", backgroundColor: PRIMARY, borderRadius: 12, height: 50,
    alignItems: "center", justifyContent: "center",
  },
  renewBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutBtn: { marginTop: 16, paddingVertical: 10 },
  logoutText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});