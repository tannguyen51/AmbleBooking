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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { bookingAPI } from "@/services/api";
import { useTranslation } from "../../i18n/useTranslation";
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
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
        error?.response?.data?.message || t("booking.payment.qrError");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    if (!qrData?.content) {
      Alert.alert(t("common.notification"), t("booking.payment.noContent"));
      return;
    }
    await Clipboard.setStringAsync(qrData.content);
    Alert.alert(t("booking.payment.copied"), t("booking.payment.copiedMessage"));
  };

  const checkStatus = async (silent = false) => {
    if (!bookingId) return;
    if (!silent) setChecking(true);
    try {
      const res = await bookingAPI.getById(bookingId);
      const booking = res.data?.booking;
      if (booking?.payment?.status === "paid") {
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
      } else if (!silent) {
        Alert.alert(t("common.notification"), t("booking.payment.notRecorded"));
      }
    } catch (error: any) {
      if (!silent) {
        const message =
          error?.response?.data?.message || t("booking.payment.checkError");
        Alert.alert(t("common.error"), message);
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
      <View style={[s.header, { paddingTop: insets.top + 12 }]}> 
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("booking.payment.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={s.timerContainer}>
            <Text style={s.sectionTitle}>{t("booking.payment.transferInfo")}</Text>
          </View>
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.label}>{t("booking.payment.bank")}</Text>
              <Text style={s.value}>{qrData?.bankCode || "TCB"}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>{t("booking.payment.accountNumber")}</Text>
              <Text style={s.value}>{qrData?.accountNumber || ""}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>{t("booking.payment.accountHolder")}</Text>
              <Text style={s.value}>{qrData?.accountName || ""}</Text>
            </View>
            <View style={s.rowBetween}>
              <Text style={s.label}>{t("booking.payment.amount")}</Text>
              <Text style={s.amount}>{amountLabel}đ</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.payment.qrCode")}</Text>
          <View style={s.qrCard}>
            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={s.loadingText}>{t("booking.payment.generatingQR")}</Text>
              </View>
            ) : qrData?.imageUrl ? (
              <Image source={{ uri: qrData.imageUrl }} style={s.qrImage} />
            ) : (
              <View style={s.loadingBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#999" />
                <Text style={s.loadingText}>{t("booking.payment.qrFallback")}</Text>
              </View>
            )}
          </View>
          <Text style={s.noteText}>
            Vui lòng chuyển đúng nội dung để hệ thống tự xác nhận.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.payment.transferContent")}</Text>
          <View style={s.contentBox}>
            <Text style={s.contentText}>{qrData?.content || ""}</Text>
          </View>
          <TouchableOpacity style={s.copyBtn} onPress={handleCopyContent}>
            <Ionicons name="copy-outline" size={16} color="#9A3412" />
            <Text style={s.copyBtnText}>{t("booking.payment.copyContent")}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.payment.bookingInfo")}</Text>
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
              <Text style={s.infoText}>{partySize} {t("booking.select.unitGuest")}</Text>
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
          >
            {checking ? (
              <>
                <ActivityIndicator color="#999" />
                <Text style={[s.checkBtnText, { color: "#999" }]}>
                  {t("booking.payment.checking")}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={s.checkBtnText}>{t("booking.payment.iHaveTransferred")}</Text>
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
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 100,
    elevation: 4,
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
  amount: { fontSize: 16, fontWeight: "800", color: "#FF6B35" },
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
  noteText: { fontSize: 12, color: "#9CA3AF", marginTop: 12 },
  contentBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDBA74",
    padding: 12,
  },
  contentText: { fontSize: 14, fontWeight: "600", color: "#92400E", textAlign: "center" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDBA74",
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
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
});




