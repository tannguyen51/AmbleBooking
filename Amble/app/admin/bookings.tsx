import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { useTranslation } from "../../i18n/useTranslation";

interface Restaurant {
  _id: string;
  name: string;
  city?: string;
  cuisine?: string;
  isActive?: boolean;
  images?: string[];
}

interface BookingItem {
  _id: string;
  bookingNumber: string;
  status: string;
  bookingDetails?: { date?: string; time?: string; partySize?: number };
  userId?: { fullName?: string; email?: string; phone?: string };
  restaurantId?: { name?: string };
  tableId?: { name?: string };
  refund?: {
    refundPercent?: number;
    refundAmount?: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    requestedAt?: string;
  };
  payment?: { status?: string };
}

const formatVnd = (amount?: number) =>
  `${Number(amount || 0).toLocaleString("vi-VN")}đ`;

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  occupied: "Đang dùng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  declined: "Đã từ chối",
  no_show: "Vắng mặt",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFFAEB", text: "#B54708" },
  confirmed: { bg: "#F0FDF4", text: "#067647" },
  occupied: { bg: "#FEF2F2", text: "#D92D20" },
  completed: { bg: "#F2F4F7", text: "#475467" },
  cancelled: { bg: "#FEE4E2", text: "#D92D20" },
  declined: { bg: "#F2F4F7", text: "#475467" },
  no_show: { bg: "#F2F4F7", text: "#475467" },
};

export default function AdminBookingsScreen() {
  const { t } = useTranslation();

  // View state: "restaurants" | "bookings"
  const [view, setView] = useState<"restaurants" | "bookings">("restaurants");

  // Restaurant list
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restSearch, setRestSearch] = useState("");
  const [restLoading, setRestLoading] = useState(true);

  // Selected restaurant
  const [selectedRestId, setSelectedRestId] = useState("");
  const [selectedRestName, setSelectedRestName] = useState("");

  // Booking list
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // Load restaurants
  useEffect(() => {
    const load = async () => {
      setRestLoading(true);
      try {
        const res = await adminAPI.getRestaurants({ limit: 100, isActive: true });
        setRestaurants(res.data?.restaurants || []);
      } catch {
        setRestaurants([]);
      } finally {
        setRestLoading(false);
      }
    };
    load();
  }, []);

  // Load bookings when restaurant or search changes
  useEffect(() => {
    if (!selectedRestId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getBookings({
          restaurantId: selectedRestId,
          search: searchText || undefined,
          limit: 100,
        } as any);
        setBookings(res.data?.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedRestId, searchText]);

  const selectRestaurant = (id: string, name: string) => {
    setSelectedRestId(id);
    setSelectedRestName(name);
    setSearchText("");
    setView("bookings");
  };

  const goBack = () => {
    setSelectedRestId("");
    setSelectedRestName("");
    setSearchText("");
    setBookings([]);
    setView("restaurants");
  };

  const copyRefundInfo = async (item: BookingItem) => {
    const r = item.refund;
    if (!r?.accountNumber) {
      Alert.alert(t("common.notification"), t("admin.bookings.missingBankInfo"));
      return;
    }
    const text = [
      `Mã: ${item.bookingNumber}`,
      `Ngân hàng: ${r.bankName || "—"}`,
      `STK: ${r.accountNumber}`,
      `Chủ TK: ${r.accountName || "—"}`,
      `Số tiền: ${formatVnd(r.refundAmount)}`,
    ].join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert(t("common.notification"), t("admin.bookings.copyInfo"));
  };

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(restSearch.toLowerCase())
  );

  // ── Render: Restaurant List ──────────────────────────
  if (view === "restaurants") {
    return (
      <View style={styles.container}>
        <AdminHeader title="Quản lý đơn hàng" subtitle="Chọn nhà hàng để xem đơn" showBack={false} />
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nhà hàng..."
            placeholderTextColor={adminTheme.colors.muted}
            value={restSearch}
            onChangeText={setRestSearch}
          />
        </View>
        {restLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRestaurants}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.restCard}
                onPress={() => selectRestaurant(item._id, item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.restImgWrap}>
                  {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.restImg} />
                  ) : (
                    <Ionicons name="restaurant-outline" size={22} color={adminTheme.colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restName}>{item.name}</Text>
                  <Text style={styles.restSub}>
                    {[item.city, item.cuisine].filter(Boolean).join(" • ") || "—"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={adminTheme.colors.muted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={40} color="#D0D5DD" />
                <Text style={styles.emptyTitle}>Không tìm thấy nhà hàng</Text>
              </View>
            }
          />
        )}
        <AdminBottomNav />
      </View>
    );
  }

  // ── Render: Booking List ─────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.bookingHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={adminTheme.colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookingHeaderTitle}>{selectedRestName}</Text>
          <Text style={styles.bookingHeaderSub}>Danh sách đơn đặt bàn</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã đơn, tên khách..."
          placeholderTextColor={adminTheme.colors.muted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
            return (
              <AdminCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCode}>{item.bookingNumber}</Text>
                    <Text style={styles.customerName}>
                      {item.userId?.fullName || "—"}
                      {item.userId?.phone ? ` • ${item.userId.phone}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <Text style={styles.metaText}>
                    🪑 {item.tableId?.name || "—"} • {item.bookingDetails?.date || ""}{" "}
                    {item.bookingDetails?.time || ""}
                  </Text>
                  <Text style={styles.metaText}>
                    👤 {item.bookingDetails?.partySize || 0} khách
                    {item.payment?.status ? ` • ${item.payment.status === "paid" ? "💳 Đã thanh toán" : "⏳ Chưa TT"}` : ""}
                  </Text>
                </View>

                {item.payment?.status === "refund_pending" || item.payment?.status === "refunded" ? (
                  <View style={styles.refundBox}>
                    <Text style={styles.refundTitle}>{t("admin.bookings.refundTitle")}</Text>
                    <View style={styles.refundRow}>
                      <Text style={styles.refundLabel}>{t("admin.bookings.refundAmount")}</Text>
                      <Text style={styles.refundValue}>
                        {formatVnd(item.refund?.refundAmount)}
                        {item.refund?.refundPercent != null ? ` (${item.refund.refundPercent}%)` : ""}
                      </Text>
                    </View>
                    <View style={styles.refundRow}>
                      <Text style={styles.refundLabel}>{t("admin.bookings.refundBank")}</Text>
                      <Text style={styles.refundValue}>{item.refund?.bankName?.trim() || "—"}</Text>
                    </View>
                    <View style={styles.refundRow}>
                      <Text style={styles.refundLabel}>{t("admin.bookings.refundAccount")}</Text>
                      <Text style={styles.refundValueMono}>{item.refund?.accountNumber?.trim() || "—"}</Text>
                    </View>
                    <View style={styles.refundRow}>
                      <Text style={styles.refundLabel}>{t("admin.bookings.refundHolder")}</Text>
                      <Text style={styles.refundValue}>{item.refund?.accountName?.trim() || "—"}</Text>
                    </View>
                    {item.payment?.status === "refund_pending" && item.refund?.accountNumber?.trim() ? (
                      <TouchableOpacity style={styles.copyBtn} onPress={() => copyRefundInfo(item)}>
                        <Ionicons name="copy-outline" size={14} color={adminTheme.colors.onSurface} />
                        <Text style={styles.copyBtnText}>{t("admin.bookings.copyInfo")}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {item.payment?.status === "refund_pending" && !item.refund?.bankName?.trim() && !item.refund?.accountNumber?.trim() ? (
                      <Text style={styles.refundWarning}>{t("admin.bookings.missingBankInfo")}</Text>
                    ) : null}
                  </View>
                ) : null}
              </AdminCard>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={40} color="#D0D5DD" />
              <Text style={styles.emptyTitle}>Không có đơn nào</Text>
              <Text style={styles.emptySub}>Nhà hàng chưa có đơn đặt bàn phù hợp.</Text>
            </View>
          }
        />
      )}

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminTheme.colors.background },

  // Search
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
    marginHorizontal: 16, marginTop: 8,
  },
  searchInput: { flex: 1, color: adminTheme.colors.onSurface, fontSize: 13 },

  // Loading
  loadingWrap: { marginTop: 30, alignItems: "center", gap: 8 },
  loadingText: { color: adminTheme.colors.muted, fontSize: 12 },

  // List
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: adminTheme.colors.onSurface },
  emptySub: { fontSize: 12, color: adminTheme.colors.muted },

  // ── Restaurant Card ──────────────────────────────────
  restCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: adminTheme.colors.surfaceVariant,
  },
  restImgWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  restImg: {
    width: "100%",
    height: "100%",
  },
  restName: { fontSize: 15, fontWeight: "700", color: adminTheme.colors.onSurface },
  restSub: { fontSize: 12, color: adminTheme.colors.muted, marginTop: 2 },

  // ── Booking Card ─────────────────────────────────────
  bookingHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    backgroundColor: adminTheme.colors.background,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1, borderColor: adminTheme.colors.surfaceVariant,
    alignItems: "center", justifyContent: "center",
  },
  bookingHeaderTitle: {
    fontSize: 18, fontWeight: "800", color: adminTheme.colors.onSurface,
  },
  bookingHeaderSub: {
    fontSize: 12, color: adminTheme.colors.muted, marginTop: 1,
  },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: adminTheme.colors.surfaceVariant,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 10,
  },
  bookingCode: {
    fontSize: 13, fontWeight: "700", color: adminTheme.colors.onSurface,
  },
  customerName: {
    fontSize: 12, color: adminTheme.colors.muted, marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  metaGrid: { gap: 3, marginBottom: 4 },
  metaText: { fontSize: 12, color: adminTheme.colors.muted },

  // ── Refund ───────────────────────────────────────────
  refundBox: {
    marginTop: 10, padding: 12, borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
    borderWidth: 1, borderColor: adminTheme.colors.surfaceLow,
    gap: 4,
  },
  refundTitle: {
    fontSize: 12, fontWeight: "700", color: adminTheme.colors.onSurface,
    marginBottom: 4,
  },
  refundRow: { flexDirection: "row", justifyContent: "space-between" },
  refundLabel: { fontSize: 12, color: adminTheme.colors.muted, fontWeight: "600" },
  refundValue: { fontSize: 12, color: adminTheme.colors.onSurface, fontWeight: "600" },
  refundValueMono: { fontSize: 12, color: adminTheme.colors.onSurface, fontWeight: "700", letterSpacing: 0.3 },
  refundWarning: { marginTop: 6, fontSize: 11, color: adminTheme.colors.danger, fontWeight: "600" },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1, borderColor: adminTheme.colors.surfaceLow,
  },
  copyBtnText: { fontSize: 11, fontWeight: "600", color: adminTheme.colors.onSurface },
});
