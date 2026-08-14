import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const { checkoutUrl, mode } = useLocalSearchParams<{ checkoutUrl?: string; mode?: string }>();
  const { partner } = usePartnerAuthStore();
  const [status, setStatus] = useState<"opening" | "waiting" | "paid" | "failed">("opening");
  const [isCheckingDirect, setIsCheckingDirect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heavyRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onPaid = async (subStatus: string) => {
    // Cập nhật store để _layout.tsx đọc được subscriptionStatus mới
    await usePartnerAuthStore.getState().loadPartner();
    setStatus("paid");
    if (timerRef.current) clearInterval(timerRef.current);
    if (heavyRef.current) clearInterval(heavyRef.current);
    const isActive = subStatus === "active";
    setTimeout(() => {
      if (isActive) {
        router.replace("/dashboard");
      } else {
        router.replace("/(partner-auth)/partner-pending");
      }
    }, 1500);
  };

  // Tín hiệu "thanh toán thật sự xong" lấy từ checkPartnerPaymentStatus
  const isPaidSignal = (d: any, m?: string): boolean =>
    d?.payosStatus === "PAID" ||
    d?.paymentType === "upgrade" ||
    d?.paymentType === "permanent" ||
    // Chỉ dành cho luồng đăng ký mới (m !== "upgrade"): webhook đã set active
    (m !== "upgrade" &&
      d?.payosStatus === undefined &&
      (d?.subscriptionStatus === "active" || d?.subscriptionStatus === "paid_pending"));

  const verifyPayos = useCallback(async (partnerId: string) => {
    const res = await paymentAPI.checkPartnerPaymentStatus(partnerId);
    const d = res.data || {};
    if (isPaidSignal(d, mode)) {
      onPaid(d.subscriptionStatus === "paid_pending" ? "paid_pending" : d.subscriptionStatus || "active");
    }
  }, [mode]);

  // Poll nhẹ mỗi 3 giây
  const checkStatus = useCallback(async () => {
    if (isCheckingDirect) return;
    try {
      const res = await partnerAuthAPI.getMe();
      const p = res.data?.partner;
      if (!p?._id) return;
      if (mode === "upgrade") {
        // Nâng cấp/gia hạn: đối tác đã active sẵn từ trước → chỉ tin khi PayOS xác nhận payment
        setIsCheckingDirect(true);
        try {
          await verifyPayos(p._id);
        } finally {
          setIsCheckingDirect(false);
        }
      } else {
        // Đăng ký: chỉ hoàn tất khi webhook đổi status khỏi "pending"
        if (p.subscriptionStatus === "active" || p.subscriptionStatus === "paid_pending") {
          onPaid(p.subscriptionStatus);
        }
      }
    } catch {}
  }, [mode, verifyPayos, isCheckingDirect]);

  // Check nặng: gọi PayOS trực tiếp — đúng mọi trường hợp (dùng khi bấm nút / app từ background về)
  const checkStatusDirect = useCallback(async () => {
    if (isCheckingDirect) return;
    setIsCheckingDirect(true);
    try {
      const res = await partnerAuthAPI.getMe();
      const p = res.data?.partner;
      if (!p?._id) return;
      await verifyPayos(p._id);
    } catch {} finally {
      setIsCheckingDirect(false);
    }
  }, [isCheckingDirect, verifyPayos]);

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

    // Lần đầu check kỹ (có fallback PayOS)
    checkStatusDirect();

    // Poll nhẹ mỗi 3 giây
    timerRef.current = setInterval(checkStatus, 3000);

    // Check nặng định kỳ (xác nhận từ PayOS) — phòng trường hợp check nhẹ bỏ sót
    heavyRef.current = setInterval(() => {
      if (!isCheckingDirect) checkStatusDirect();
    }, 10000);

    // Khi app quay lại foreground → check kỹ
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        checkStatusDirect();
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heavyRef.current) clearInterval(heavyRef.current);
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
            <Text style={s.note}>
              {isCheckingDirect ? "Đang kiểm tra với PayOS..." : "Đang kiểm tra trạng thái thanh toán..."}
            </Text>

            {status === "waiting" && (
              <TouchableOpacity
                style={[s.retryBtn, isCheckingDirect && { opacity: 0.5 }]}
                onPress={checkStatusDirect}
                disabled={isCheckingDirect}
              >
                <Ionicons name="refresh" size={16} color={PRIMARY} />
                <Text style={s.retryText}>
                  {isCheckingDirect ? "Đang kiểm tra..." : "Kiểm tra lại"}
                </Text>
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
            onPress={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (heavyRef.current) clearInterval(heavyRef.current);
              setStatus("failed");
              router.replace("/dashboard");
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
