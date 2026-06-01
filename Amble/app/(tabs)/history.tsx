﻿﻿import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { bookingAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "../../i18n/useTranslation";

const PRIMARY = "#FF6B35";

type Tab = "active" | "pending_payment" | "completed" | "cancelled";

const BANK_OPTIONS = [
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Techcombank",
  "ACB",
  "MBBank",
  "VPBank",
  "Sacombank",
];

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const TAB_CONFIG: { id: Tab; label: string; statuses: string[] }[] = [
    {
      id: "active",
      label: t("history.tabActive"),
      statuses: ["pending", "confirmed", "paid", "draft"],
    },
    {
      id: "pending_payment",
      label: t("history.tabPendingPayment"),
      statuses: ["pending_payment"],
    },
    { id: "completed", label: t("history.tabCompleted"), statuses: ["completed"] },
    {
      id: "cancelled",
      label: t("history.tabCancelled"),
      statuses: ["cancelled", "refund_pending", "refunded"],
    },
  ];

  const STATUS_DISPLAY: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    draft: { label: t("history.statusPending"), color: "#92400E", bg: "#FEF3C7" },
    pending: { label: t("history.statusPending"), color: "#92400E", bg: "#FEF3C7" },
    pending_payment: {
      label: t("history.statusPendingPayment"),
      color: "#B45309",
      bg: "#FEF3C7",
    },
    confirmed: { label: t("history.statusConfirmed"), color: "#065F46", bg: "#D1FAE5" },
    paid: { label: t("history.statusPaid"), color: "#1D4ED8", bg: "#DBEAFE" },
    completed: { label: t("history.statusCompleted"), color: "#374151", bg: "#F3F4F6" },
    cancelled: { label: t("history.statusCancelled"), color: "#991B1B", bg: "#FEE2E2" },
    refund_pending: {
      label: t("history.statusRefundPending"),
      color: "#92400E",
      bg: "#FEF3C7",
    },
    refunded: { label: t("history.statusRefunded"), color: "#065F46", bg: "#D1FAE5" },
  };

  const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
    pending_payment: { label: t("history.statusPendingPayment"), color: "#B45309" },
    paid: { label: t("history.statusPaid"), color: "#1D4ED8" },
    completed: { label: t("history.statusPaid"), color: "#1D4ED8" },
    cancelled: { label: t("history.statusCancelled"), color: "#991B1B" },
    refund_pending: { label: t("history.statusRefundPending"), color: "#92400E" },
    refunded: { label: t("history.statusRefunded"), color: "#065F46" },
    confirmed: { label: t("history.statusUnpaid"), color: "#6B7280" },
    pending: { label: t("history.statusUnpaid"), color: "#6B7280" },
    draft: { label: t("history.statusUnpaid"), color: "#6B7280" },
  };

  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [refundVisible, setRefundVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [refundPreview, setRefundPreview] = useState<{
    hoursRemaining: number;
    refundPercent: number;
    refundAmount: number;
  } | null>(null);
  const [refundForm, setRefundForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [showBankList, setShowBankList] = useState(false);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getPaymentCountdown = (booking: any) => {
    if (booking.status !== "pending_payment") return null;
    if (booking.paymentExpiresAt) {
      const secondsLeft = Math.max(
        0,
        Math.floor((new Date(booking.paymentExpiresAt).getTime() - Date.now()) / 1000),
      );
      return secondsLeft;
    }
    if (booking.paymentTimeRemainingSeconds !== undefined) {
      return booking.paymentTimeRemainingSeconds;
    }
    // Fallback: tính từ createdAt + 10 phút
    if (booking.createdAt) {
      const expiresAt = new Date(new Date(booking.createdAt).getTime() + 10 * 60 * 1000);
      return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    }
    return 0;
  };

  const hasPaidBooking = (booking: any) => {
    return Boolean(booking?.payment?.paidAt) || ["paid", "completed"].includes(booking?.status);
  };

  const fetchBookings = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await bookingAPI.getUserBookings(user._id);
      console.log("[history] Fetched bookings:", res.data.bookings?.length || 0);
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancel = async (bookingId: string) => {
    const booking = bookings.find((b) => b._id === bookingId) || null;
    if (!booking) return;

    setCancelling(bookingId);
    try {
      if (!hasPaidBooking(booking)) {
        const res = await bookingAPI.cancel(bookingId, { reason: "Người dùng hủy" });
        const newStatus = res.data?.booking?.status || "cancelled";
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? { ...b, status: newStatus, refund: res.data?.booking?.refund }
              : b,
          ),
        );
        Alert.alert(t("common.success"), t("history.cancelSuccess"));
        return;
      }

      const res = await bookingAPI.getRefundPreview(bookingId);
      setRefundPreview(res.data?.preview || null);
      setSelectedBooking(booking);
      setRefundForm({ bankName: "", accountNumber: "", accountName: "" });
      setShowBankList(false);
      setRefundVisible(true);
    } catch (err: any) {
      Alert.alert(
        t("common.error"),
        err.response?.data?.message || t("history.cancelFailed"),
      );
    } finally {
      setCancelling(null);
    }
  };

  const submitCancel = async () => {
    if (!selectedBooking) return;
    const amount = refundPreview?.refundAmount || 0;
    if (amount > 0) {
      if (!refundForm.bankName || !refundForm.accountNumber || !refundForm.accountName) {
        Alert.alert(t("common.error"), t("history.refundInfoRequired"));
        return;
      }
    }

    setCancelling(selectedBooking._id);
    try {
      const payload =
        amount > 0
          ? {
              reason: "Người dùng hủy",
              refundAccount: {
                bankName: refundForm.bankName,
                accountNumber: refundForm.accountNumber,
                accountName: refundForm.accountName,
              },
            }
          : { reason: "Người dùng hủy" };
      const res = await bookingAPI.cancel(selectedBooking._id, payload);
      const newStatus = res.data?.booking?.status || "cancelled";
      setBookings((prev) =>
        prev.map((b) =>
          b._id === selectedBooking._id
            ? { ...b, status: newStatus, refund: res.data?.booking?.refund }
            : b,
        ),
      );
      Alert.alert(
        t("common.success"),
        amount > 0 ? t("history.refundRequestSent") : t("history.cancelSuccess"),
      );
      setRefundVisible(false);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.response?.data?.message || t("history.cancelFailed"));
    } finally {
      setCancelling(null);
    }
  };

  const currentTab = TAB_CONFIG.find((t) => t.id === activeTab)!;
  const filteredBookings = bookings.filter((b) =>
    currentTab.statuses.includes(b.status),
  );

  const renderItem = ({ item }: { item: any }) => {
    const restaurant = item.restaurantId;
    const table = item.tableId;
    const status = STATUS_DISPLAY[item.status] || STATUS_DISPLAY.draft;
    const paymentStatus =
      PAYMENT_STATUS[item.status] || PAYMENT_STATUS.confirmed;
    const paymentCountdown = getPaymentCountdown(item);
    const goToPayment = () =>
      router.push({
        pathname: "/booking/payment" as any,
        params: {
          bookingId: item._id,
          bookingNumber: item.bookingNumber,
          restaurantName: restaurant?.name || "Nhà hàng",
          restaurantImage: restaurant?.images?.[0],
          tableName: table?.name || "Bàn",
          date: item.bookingDetails?.date || "",
          time: item.bookingDetails?.time || "",
          partySize: String(item.bookingDetails?.partySize || ""),
          deposit: String(item.pricing?.totalAmount || "0"),
        },
      });
    const canCancel = [
      "draft",
      "pending",
      "pending_payment",
      "confirmed",
      "paid",
    ].includes(item.status);
    const canPay = item.status === "pending_payment";

    return (
      <View style={c.card}>
        <Image
          source={{
            uri:
              restaurant?.images?.[0] ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
          }}
          style={c.cardImg}
        />

        <View style={c.cardBody}>
          <View style={c.cardHeaderRow}>
            <Text style={c.restName} numberOfLines={1}>
              {restaurant?.name || "Nhà hàng"}
            </Text>
            {canPay ? (
              <TouchableOpacity
                style={[c.statusBadge, { backgroundColor: status.bg }]}
                onPress={goToPayment}
                activeOpacity={0.8}
              >
                <Text style={[c.statusTxt, { color: status.color }]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[c.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[c.statusTxt, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            )}
          </View>

            {canPay && paymentCountdown !== null ? (
              <View style={c.countdownRow}>
                <Ionicons name="time-outline" size={14} color="#B45309" />
                <Text style={c.countdownText}>
                  {t("history.countdownPayment", { time: formatCountdown(paymentCountdown) })}
                </Text>
              </View>
            ) : null}

          <View style={c.detailRow}>
            <Ionicons name="restaurant-outline" size={13} color="#9CA3AF" />
            <Text style={c.detailTxt}>{table?.name || "Bàn"}</Text>
          </View>
          <View style={c.detailRow}>
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text style={c.detailTxt}>
              {item.bookingDetails?.date} • {item.bookingDetails?.time}
            </Text>
          </View>
          <View style={c.detailRow}>
            <Ionicons name="people-outline" size={13} color="#9CA3AF" />
            <Text style={c.detailTxt}>
              {item.bookingDetails?.partySize} người
            </Text>
          </View>
          {canPay ? (
            <TouchableOpacity
              style={c.detailRow}
              onPress={goToPayment}
              activeOpacity={0.8}
            >
              <Ionicons
                name="card-outline"
                size={13}
                color={paymentStatus.color}
              />
              <Text
                style={[
                  c.detailTxt,
                  { color: paymentStatus.color, fontWeight: "700" },
                ]}
              >
                Thanh toán: {paymentStatus.label}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={c.detailRow}>
              <Ionicons
                name="card-outline"
                size={13}
                color={paymentStatus.color}
              />
              <Text
                style={[
                  c.detailTxt,
                  { color: paymentStatus.color, fontWeight: "700" },
                ]}
              >
                Thanh toán: {paymentStatus.label}
              </Text>
            </View>
          )}

          <View style={c.cardFooter}>
            <View>
              <Text style={c.depositLabel}>{t("history.depositLabel")}</Text>
              <Text style={c.depositValue}>
                {item.pricing?.totalAmount?.toLocaleString("vi-VN")}đ
              </Text>
            </View>
            <Text style={c.bookingNum}>#{item.bookingNumber}</Text>
          </View>

          {canCancel && (
            <TouchableOpacity
              style={c.cancelBtn}
              onPress={() => handleCancel(item._id)}
              disabled={cancelling === item._id}
              activeOpacity={0.7}
            >
              {cancelling === item._id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={c.cancelTxt}>{t("history.cancelBooking")}</Text>
              )}
            </TouchableOpacity>
          )}

          {canPay && (
            <TouchableOpacity
              style={c.payBtn}
              onPress={goToPayment}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#FF6B35", "#FFD700"]}
                style={c.payBtnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={c.payBtnText}>{t("history.payNow")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      <View style={[s.header, { paddingTop: 12 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("history.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabBar}>
        {TAB_CONFIG.map((tab) => {
          const count = bookings.filter((b) =>
            tab.statuses.includes(b.status),
          ).length;
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>
                {tab.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
              {active && <View style={s.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTxt}>{t("history.emptyTitle")}</Text>
          <TouchableOpacity
            style={s.exploreBtn}
            onPress={() => router.push("/(tabs)/")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF6B35", "#FFD700"]}
              style={s.exploreBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.exploreBtnTxt}>{t("history.emptyAction")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal transparent visible={refundVisible} animationType="fade">
        <View style={c.modalBackdrop}>
          <View style={c.modalCard}>
            <Text style={c.modalTitle}>{t("history.modalCancelTitle")}</Text>
            <Text style={c.modalSubtitle}>
              {t("history.modalRefundNote")}
            </Text>

            <View style={c.previewRow}>
              <Text style={c.previewLabel}>Hoàn tiền</Text>
              <Text style={c.previewValue}>
                {refundPreview?.refundAmount?.toLocaleString("vi-VN") || 0}đ
              </Text>
            </View>
            <Text style={c.previewMeta}>
              {t("history.modalRefundPercent", { percent: refundPreview?.refundPercent || 0, hours: Math.round(refundPreview?.hoursRemaining || 0) })}
            </Text>

            <TouchableOpacity
              style={c.bankSelect}
              onPress={() => setShowBankList((prev) => !prev)}
            >
              <Text style={c.bankSelectText}>
                {refundForm.bankName || t("history.modalSelectBank")}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            {showBankList ? (
              <View style={c.bankList}>
                {BANK_OPTIONS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={c.bankItem}
                    onPress={() => {
                      setRefundForm((prev) => ({ ...prev, bankName: bank }));
                      setShowBankList(false);
                    }}
                  >
                    <Text style={c.bankItemText}>{bank}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <TextInput
              style={c.modalInput}
              placeholder={t("history.modalAccountNumber")}
              placeholderTextColor="#94A3B8"
              value={refundForm.accountNumber}
              onChangeText={(value) =>
                setRefundForm((prev) => ({ ...prev, accountNumber: value }))
              }
            />
            <TextInput
              style={c.modalInput}
              placeholder={t("history.modalAccountHolder")}
              placeholderTextColor="#94A3B8"
              value={refundForm.accountName}
              onChangeText={(value) =>
                setRefundForm((prev) => ({ ...prev, accountName: value }))
              }
            />

            <View style={c.modalActions}>
              <TouchableOpacity
                style={[c.modalBtn, c.modalGhost]}
                onPress={() => setRefundVisible(false)}
              >
                <Text style={c.modalGhostText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[c.modalBtn, c.modalPrimary]}
                onPress={submitCancel}
                disabled={cancelling === selectedBooking?._id}
              >
                <Text style={c.modalPrimaryText}>{t("history.modalConfirmCancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    position: "relative",
  },
  tabActive: {},
  tabTxt: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  tabTxtActive: { color: PRIMARY, fontWeight: "700" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: PRIMARY,
    borderRadius: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTxt: { fontSize: 16, color: "#9CA3AF", fontWeight: "600" },
  exploreBtn: { borderRadius: 12, overflow: "hidden", marginTop: 8 },
  exploreBtnInner: { paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImg: { width: "100%", height: 120 },
  cardBody: { padding: 14 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  restName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countdownText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  detailTxt: { fontSize: 13, color: "#6B7280" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  depositLabel: { fontSize: 11, color: "#9CA3AF" },
  depositValue: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  bookingNum: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  cancelTxt: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
  payBtn: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  payBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  payBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  previewMeta: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 12,
  },
  bankSelect: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bankSelectText: {
    fontSize: 12,
    color: "#0F172A",
  },
  bankList: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  bankItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  bankItemText: {
    fontSize: 12,
    color: "#0F172A",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  modalGhost: {
    backgroundColor: "#E2E8F0",
  },
  modalPrimary: {
    backgroundColor: PRIMARY,
  },
  modalGhostText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});






