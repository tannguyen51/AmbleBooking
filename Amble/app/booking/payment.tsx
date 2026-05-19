import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { bookingAPI } from "@/services/api";
import * as Clipboard from "expo-clipboard";

const PRIMARY = "#FF6B35";

type QrData = {
  imageUrl?: string;
  amount: number;
  content: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export default function BookingPaymentScreen() {
  const router = useRouter();
  const {
    bookingId,
    bookingNumber,
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
    restaurantName: string;
    restaurantImage?: string;
    tableName: string;
    date: string;
    time: string;
    partySize: string;
    deposit: string;
  }>();

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const amountLabel = useMemo(() => {
    const amount = qrData?.amount ?? Number(deposit || 0);
    return amount.toLocaleString("vi-VN");
  }, [qrData?.amount, deposit]);

  const loadQr = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await bookingAPI.getPaymentQr(bookingId);
      setQrData(res.data?.qr || null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể tạo mã QR";
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    if (!qrData?.content) {
      Alert.alert("Thông báo", "Chưa có nội dung chuyển khoản");
      return;
    }
    await Clipboard.setStringAsync(qrData.content);
    Alert.alert("Đã sao chép", "Nội dung chuyển khoản đã được copy");
  };

  const checkStatus = async (silent = false) => {
    if (!bookingId) return;
    if (!silent) setChecking(true);
    try {
      const res = await bookingAPI.getById(bookingId);
      const booking = res.data?.booking;
      if (booking?.status === "paid") {
        router.replace({
          pathname: "/booking/success" as any,
          params: {
            restaurantName,
            restaurantImage,
            tableName,
            date,
            time,
            partySize,
            deposit: deposit || "0",
            bookingId: bookingNumber || bookingId,
          },
        });
      } else if (!silent) {
        Alert.alert("Thông báo", "Chưa ghi nhận thanh toán. Vui lòng thử lại.");
      }
    } catch (error: any) {
      if (!silent) {
        const message =
          error?.response?.data?.message || "Không kiểm tra được trạng thái";
        Alert.alert("Lỗi", message);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const timer = setInterval(() => {
      checkStatus(true);
    }, 7000);
    return () => clearInterval(timer);
  }, [bookingId]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thanh toán cọc</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Thông tin chuyển khoản</Text>
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.label}>Ngân hàng</Text>
              <Text style={s.value}>{qrData?.bankCode || "TCB"}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>Số tài khoản</Text>
              <Text style={s.value}>{qrData?.accountNumber || ""}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>Chủ tài khoản</Text>
              <Text style={s.value}>{qrData?.accountName || ""}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>Số tiền</Text>
              <Text style={s.amount}>{amountLabel}đ</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Mã QR chuyển khoản</Text>
          <View style={s.qrCard}>
            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={s.loadingText}>Đang tạo QR...</Text>
              </View>
            ) : qrData?.imageUrl ? (
              <Image
                source={{ uri: qrData.imageUrl }}
                style={s.qrImage}
              />
            ) : (
              <View style={s.loadingBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#999" />
                <Text style={s.loadingText}>Chưa thể tạo QR</Text>
              </View>
            )}
          </View>
          <Text style={s.noteText}>
            Vui lòng chuyển đúng nội dung để hệ thống tự xác nhận.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Nội dung chuyển khoản</Text>
          <View style={s.contentBox}>
            <Text style={s.contentText}>{qrData?.content || ""}</Text>
          </View>
          <TouchableOpacity
            style={s.copyBtn}
            onPress={handleCopyContent}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={16} color="#9A3412" />
            <Text style={s.copyBtnText}>Copy nội dung</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Thông tin đặt bàn</Text>
          <View style={s.card}>
            <View style={s.infoRow}>
              <Ionicons name="restaurant-outline" size={18} color="#666" />
              <Text style={s.infoText}>{restaurantName}</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <Text style={s.infoText}>{date}</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={s.infoText}>{time}</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="people-outline" size={18} color="#666" />
              <Text style={s.infoText}>{partySize} người</Text>
            </View>
            {!!tableName && (
              <View style={s.infoRow}>
                <Ionicons name="grid-outline" size={18} color="#666" />
                <Text style={s.infoText}>{tableName}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.checkBtn}
          onPress={() => checkStatus(false)}
          disabled={checking}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={checking ? ["#E5E7EB", "#E5E7EB"] : ["#FF6B35", "#FFD700"]}
            style={s.checkBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {checking ? (
              <>
                <ActivityIndicator color="#999" />
                <Text style={[s.checkBtnText, { color: "#999" }]}>
                  Đang kiểm tra...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={s.checkBtnText}>Tôi đã chuyển khoản</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 35,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, color: "#6B7280" },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },
  amount: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    alignItems: "center",
  },
  qrImage: { width: 240, height: 240, borderRadius: 12 },
  loadingBox: { alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12, color: "#9CA3AF" },
  noteText: { fontSize: 12, color: "#FF6B35", marginTop: 8 },
  contentBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 12,
  },
  contentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9A3412",
    textAlign: "center",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFFBEB",
  },
  copyBtnText: { fontSize: 13, fontWeight: "700", color: "#9A3412" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 13, color: "#1F2937" },
  bottomBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  checkBtn: { borderRadius: 12, overflow: "hidden" },
  checkBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  checkBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
