import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { paymentAPI } from "@/services/api";

const POLL_INTERVAL = 3000;
const PAYMENT_TIMEOUT = 10 * 60 * 1000; // 10 phút

export default function PayosPaymentScreen() {
  const router = useRouter();
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
  const [message, setMessage] = useState("Đang chờ thanh toán...");
  const startedAt = useRef(Date.now());

  const navigateToSuccess = () => {
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
  };

  const checkStatus = async () => {
    if (!bookingId) return;
    try {
      const res = await paymentAPI.getPayosStatus(bookingId);
      const payosStatus = res.data?.status;

      if (payosStatus === "PAID" || payosStatus === "COMPLETED") {
        setStatus("PAID");
        setMessage("Thanh toán thành công!");
        setTimeout(navigateToSuccess, 800);
        return true;
      }

      if (payosStatus === "CANCELLED") {
        setStatus("CANCELLED");
        setMessage("Đã hủy thanh toán.");
        return true;
      }

      // Check timeout
      if (Date.now() - startedAt.current > PAYMENT_TIMEOUT) {
        setStatus("EXPIRED");
        setMessage("Hết thời gian thanh toán.");
        return true;
      }

      setMessage("Đang chờ thanh toán...");
    } catch {
      setMessage("Đang kiểm tra trạng thái...");
    }
    return false;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      checkStatus();
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [bookingId]);

  // Check khi app trở lại từ background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkStatus();
    });
    return () => sub.remove();
  }, [bookingId]);

  const isFinal = status === "PAID" || status === "CANCELLED" || status === "EXPIRED";

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient
        colors={["#ff8b25", "#ffd109", "#ffb347"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
      />

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
            : "Vui lòng hoàn tất thanh toán qua PayOS.\nSau đó quay lại ứng dụng."}
        </Text>

        {!isFinal && (
          <Text style={s.hint}>
            Đang kiểm tra trạng thái mỗi 3 giây...
          </Text>
        )}

        {isFinal && status !== "PAID" && (
          <Text
            style={s.backBtn}
            onPress={() => router.back()}
          >
            Quay lại
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
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
  },
  backBtn: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textDecorationLine: "underline",
    marginTop: 16,
    padding: 12,
  },
});
