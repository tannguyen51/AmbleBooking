import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, AppState, AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { partnerAuthAPI, paymentAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

export default function PartnerPaymentScreen() {
  const router = useRouter();
  const { checkoutUrl } = useLocalSearchParams<{ checkoutUrl: string }>();
  const { partner } = usePartnerAuthStore();
  const [status, setStatus] = useState<"opening" | "waiting" | "paid" | "failed">("opening");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = async () => {
    try {
      // Ưu tiên check nhanh qua getMe (webhook đã cập nhật)
      const res = await partnerAuthAPI.getMe();
      const p = res.data?.partner;
      if (p?.subscriptionStatus === "paid_pending" || p?.subscriptionStatus === "active") {
        setStatus("paid");
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => {
          if (p?.subscriptionStatus === "active") {
            router.replace("/dashboard");
          } else {
            router.replace("/(partner-auth)/partner-pending");
          }
        }, 1500);
        return;
      }

      // Nếu vẫn pending → check trực tiếp với PayOS (fallback khi webhook chưa kịp)
      if (p?._id) {
        const payosCheck = await paymentAPI.checkPartnerPaymentStatus(p._id);
        const subStatus = payosCheck.data?.subscriptionStatus;
        if (subStatus === "active" || subStatus === "paid_pending") {
          setStatus("paid");
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            if (subStatus === "active") {
              router.replace("/dashboard");
            } else {
              router.replace("/(partner-auth)/partner-pending");
            }
          }, 1500);
        }
      }
    } catch {}
  };

  // Mở PayOS khi vào screen
  useEffect(() => {
    if (checkoutUrl) {
      Linking.openURL(checkoutUrl).catch(() => {});
      setStatus("waiting");
    } else {
      setStatus("failed");
    }
  }, [checkoutUrl]);

  // Poll + AppState listener
  useEffect(() => {
    if (status !== "waiting") return;

    // Kiểm tra ngay lập tức
    checkStatus();

    // Poll mỗi 3 giây
    timerRef.current = setInterval(checkStatus, 3000);

    // Khi app quay lại foreground → kiểm tra ngay
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        checkStatus();
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [status]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {status === "opening" || status === "waiting" ? (
          <>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={s.title}>Đang chờ thanh toán</Text>
            <Text style={s.subtitle}>
              Vui lòng hoàn tất thanh toán qua PayOS.{"\n"}
              Trang này sẽ tự động cập nhật khi thanh toán thành công.
            </Text>
            <Text style={s.note}>Đang kiểm tra trạng thái thanh toán...</Text>

            {status === "waiting" && (
              <TouchableOpacity style={s.retryBtn} onPress={checkStatus}>
                <Ionicons name="refresh" size={16} color={PRIMARY} />
                <Text style={s.retryText}>Kiểm tra lại</Text>
              </TouchableOpacity>
            )}
          </>
        ) : status === "paid" ? (
          <>
            <View style={[s.iconWrap, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>
            <Text style={s.title}>Thanh toán thành công!</Text>
            <Text style={s.subtitle}>
              Cảm ơn bạn! Đang chuyển đến trang tiếp theo...
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
  retryBtn: {
    marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: PRIMARY, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  retryText: { color: PRIMARY, fontSize: 14, fontWeight: "700" },
  btn: {
    marginTop: 16, backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: { marginTop: 24, padding: 12 },
  cancelText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});
