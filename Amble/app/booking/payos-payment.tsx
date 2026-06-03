import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { paymentAPI, bookingAPI } from "@/services/api";

const POLL_INTERVAL = 3000;
const PAYMENT_TIMEOUT = 10 * 60 * 1000;

export default function PayosPaymentScreen() {
  const router = useRouter();
  const insets = { top: 0 }; // sẽ dùng safe area
  const {
    bookingId,
    bookingNumber,
    restaurantId,
    restaurantName,
    restaurantImage,
    tableName,
    date,
    time,
    partySize,
    deposit,
  } = useLocalSearchParams<{
    bookingId: string;
    bookingNumber?: string;
    restaurantId?: string;
    restaurantName: string;
    restaurantImage?: string;
    tableName: string;
    date: string;
    time: string;
    partySize: string;
    deposit: string;
  }>();

  const [status, setStatus] = useState<string>("PENDING");
  const [manualChecking, setManualChecking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const startedAt = useRef(Date.now());
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const navigateToSuccess = useCallback(() => {
    router.replace({
      pathname: "/booking/success" as any,
      params: {
        restaurantId,
        restaurantName,
        restaurantImage,
        tableName,
        date,
        time,
        partySize,
        deposit: deposit || "0",
        bookingId,
        bookingNumber,
      },
    });
  }, [bookingId, bookingNumber, date, deposit, partySize, restaurantId, restaurantImage, restaurantName, router, tableName, time]);

  // Gọi kiểm tra không hiển thị loading (cho interval + AppState)
  const silentCheck = useCallback(async () => {
    if (!bookingId || !isMounted.current) return false;
    try {
      const res = await paymentAPI.getPayosStatus(bookingId);
      const payosStatus = (res.data?.status || "").toUpperCase();

      if (payosStatus === "PAID" || payosStatus === "COMPLETED") {
        setStatus("PAID");
        setTimeout(navigateToSuccess, 800);
        return true;
      }
      if (payosStatus === "CANCELLED") {
        setStatus("CANCELLED");
        return true;
      }
    } catch {
      // ignore
    }

    // Fallback: check trực tiếp booking status từ database
    try {
      const bookingRes = await bookingAPI.getById(bookingId);
      const bookingStatus = bookingRes.data?.booking?.status;
      if (bookingStatus === "paid") {
        setStatus("PAID");
        setTimeout(navigateToSuccess, 800);
        return true;
      }
    } catch {
      // ignore
    }

    if (Date.now() - startedAt.current > PAYMENT_TIMEOUT) {
      setStatus("EXPIRED");
      return true;
    }
    return false;
  }, [bookingId, navigateToSuccess]);

  // Gọi kiểm tra có loading (cho nút bấm)
  const manualCheck = useCallback(async () => {
    if (!bookingId || manualChecking) return;
    setManualChecking(true);
    await silentCheck();
    if (isMounted.current) setManualChecking(false);
  }, [bookingId, manualChecking, silentCheck]);

  // Hủy đặt bàn
  const handleCancel = useCallback(() => {
    Alert.alert(
      "Hủy đặt bàn",
      "Bạn có chắc muốn hủy đặt bàn này? Booking sẽ bị hủy và bạn có thể đặt lại sau.",
      [
        { text: "Ở lại", style: "cancel" },
        {
          text: "Hủy đặt bàn",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await paymentAPI.cancelPayosPayment(bookingId);
            } catch {
              // kể cả lỗi vẫn cho back
            }
            if (isMounted.current) setCancelling(false);
            router.back();
          },
        },
      ],
    );
  }, [bookingId, router]);

  // Polling tự động
  useEffect(() => {
    const timer = setInterval(() => { silentCheck(); }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [silentCheck]);

  // Check khi app từ background trở lại
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") silentCheck();
    });
    return () => sub.remove();
  }, [silentCheck]);

  const isFinal = status === "PAID" || status === "CANCELLED" || status === "EXPIRED";

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient
        colors={["#ff8b25", "#ffd109", "#ffb347"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
      />

      {/* Header với nút back */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={handleCancel}
          style={s.backBtn}
          disabled={cancelling}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {cancelling && (
          <ActivityIndicator color="#fff" size="small" style={{ marginRight: 44 }} />
        )}
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          {status === "PAID" ? (
            <Ionicons name="checkmark-circle" size={80} color="#fff" />
          ) : status === "CANCELLED" || status === "EXPIRED" ? (
            <Ionicons name="close-circle" size={80} color="#fff" />
          ) : (
            <ActivityIndicator size="large" color="#fff" />
          )}
        </View>

        <Text style={s.title}>
          {status === "PAID"
            ? "Thanh toán thành công!"
            : status === "CANCELLED"
            ? "Đã hủy thanh toán"
            : status === "EXPIRED"
            ? "Hết thời gian thanh toán"
            : "Đang xử lý thanh toán"}
        </Text>

        <Text style={s.subtitle}>
          {status === "PAID"
            ? "Đang chuyển hướng..."
            : status === "CANCELLED"
            ? "Bạn có thể thực hiện lại đặt bàn."
            : status === "EXPIRED"
            ? "Vui lòng đặt bàn lại để thanh toán."
            : "Vui lòng hoàn tất thanh toán qua PayOS.\nSau đó quay lại ứng dụng và nhấn 'Kiểm tra lại'."}
        </Text>

        {!isFinal && (
          <TouchableOpacity
            style={s.retryBtn}
            onPress={manualCheck}
            disabled={manualChecking}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.retryBtnText}>
              {manualChecking ? "Đang kiểm tra..." : "Kiểm tra lại"}
            </Text>
          </TouchableOpacity>
        )}

        {!isFinal && (
          <Text style={s.hint}>
            Tự động kiểm tra mỗi 3 giây
          </Text>
        )}

        {!isFinal && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.85)" />
            <Text style={s.cancelBtnText}>
              {cancelling ? "Đang hủy..." : "Hủy đặt bàn"}
            </Text>
          </TouchableOpacity>
        )}

        {isFinal && status !== "PAID" && (
          <Text style={s.backLink} onPress={() => router.back()}>
            Quay lại
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  backLink: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textDecorationLine: "underline",
    marginTop: 16,
    padding: 12,
  },
});
