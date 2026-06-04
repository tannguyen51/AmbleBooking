import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { useTranslation } from "../../i18n/useTranslation";

const MANAGEABLE_STATUSES = new Set([
  "pending", "confirmed", "occupied", "completed",
  "cancelled", "declined", "no_show",
]);

interface BookingRefund {
  refundPercent?: number;
  refundAmount?: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  requestedAt?: string;
}

interface BookingItem {
  _id: string;
  bookingNumber: string;
  status: string;
  bookingDetails?: { date?: string; time?: string; partySize?: number };
  userId?: { fullName?: string; email?: string; phone?: string };
  restaurantId?: { name?: string };
  tableId?: { name?: string };
  refund?: BookingRefund;
  payment?: { status?: string };
}

const formatVnd = (amount?: number) =>
  `${Number(amount || 0).toLocaleString("vi-VN")}đ`;

const getStatusTone = (
  status: string,
): "warning" | "success" | "danger" | "info" | "default" => {
  if (status === "pending") return "warning";
  if (status === "confirmed" || status === "completed") return "success";
  if (status === "occupied" || status === "cancelled") return "danger";
  if (status === "no_show" || status === "declined") return "info";
  return "default";
};

export default function AdminBookingsScreen() {
  const { t } = useTranslation();

  const BOOKING_FILTERS: { value: string; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "pending", label: t("admin.bookings.statusPending") },
    { value: "confirmed", label: t("admin.bookings.statusConfirmed") },
    { value: "occupied", label: t("admin.bookings.statusOccupied") },
    { value: "completed", label: t("admin.bookings.statusCompleted") },
    { value: "cancelled", label: t("admin.bookings.statusCancelled") },
    { value: "no_show", label: t("admin.bookings.statusNoShow") },
  ];

  const STATUS_LABELS: Record<string, string> = {
    pending: t("admin.bookings.statusPending"),
    confirmed: t("admin.bookings.statusConfirmed"),
    occupied: t("admin.bookings.statusOccupied"),
    completed: t("admin.bookings.statusCompleted"),
    cancelled: t("admin.bookings.statusCancelled"),
    declined: t("admin.bookings.statusDeclined"),
    no_show: t("admin.bookings.statusNoShow"),
  };

  const [status, setStatus] = useState<
    "all" | "pending" | "confirmed" | "occupied" | "completed" | "cancelled" | "no_show"
  >("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const limit = 20;

  const loadBookings = async (reset = false) => {
    setLoading(true);
    try {
      const nextPage = reset ? 1 : page + 1;
      const res = await adminAPI.getBookings({
        status: status === "all" ? undefined : status,
        search: search || undefined,
        date: date || undefined,
        page: nextPage,
        limit,
      } as any);
      const list = res.data?.bookings || [];
      const total = Number(res.data?.total || 0);
      const merged = reset ? list : [...bookings, ...list];
      setBookings(merged);
      setPage(nextPage);
      setHasMore(merged.length < total);
    } catch {
      if (reset) setBookings([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings(true);
  }, [status]);

  const setStatusAction = (item: BookingItem, newStatus: string) => {
    setSelectedBooking(item);
    setTargetStatus(newStatus);
    setStatusDialogVisible(true);
  };

  const applyFilters = () => {
    loadBookings(true);
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

  const resetFilters = () => {
    setSearch("");
    setDate("");
    setStatus("all");
    setTimeout(() => loadBookings(true), 0);
  };

  return (
    <View style={styles.container}>
      <AdminHeader title={t("admin.bookings.title")} subtitle={t("admin.bookings.subtitle")} showBack={false} />

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>{t("admin.bookings.quickFilter")}</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("admin.bookings.searchPlaceholder")}
            placeholderTextColor={adminTheme.colors.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={applyFilters}
          />
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="calendar-outline" size={16} color={adminTheme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("admin.bookings.datePlaceholder")}
            placeholderTextColor={adminTheme.colors.muted}
            value={date}
            onChangeText={setDate}
            onSubmitEditing={applyFilters}
          />
        </View>
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>{t("admin.bookings.clearFilter")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>{t("admin.bookings.filterButton")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t("admin.bookings.quickFilter")}</Text>
        <View style={styles.quickFilterRow}>
          {BOOKING_FILTERS.map((item) => {
            const active = status === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.quickFilterChip, active && styles.quickFilterChipActive]}
                onPress={() => setStatus(item.value)}
              >
                <Text
                  style={[styles.quickFilterText, active && styles.quickFilterTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadBookings(false)}
                disabled={loading}
              >
                <Text style={styles.loadMoreText}>{t("common.loading")}</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.bookingNumber}</Text>
                <StatusBadge
                  label={STATUS_LABELS[item.status] || item.status}
                  tone={getStatusTone(item.status)}
                />
              </View>
              <Text style={styles.meta}>
                {item.restaurantId?.name || t("admin.restaurants.title")} • {item.tableId?.name || t("common.noData")}
              </Text>
              <Text style={styles.meta}>
                {item.userId?.fullName || t("common.noData")}
                {item.userId?.phone ? ` • ${item.userId.phone}` : ""}
                {" • "}
                {item.bookingDetails?.date || ""} {item.bookingDetails?.time || ""}
              </Text>

              {item.payment?.status === "refund_pending" || item.payment?.status === "refunded" ? (
                <View style={styles.refundBox}>
                  <Text style={styles.refundTitle}>{t("admin.bookings.refundTitle")}</Text>
                  <Text style={styles.refundRow}>
                    <Text style={styles.refundLabel}>{t("admin.bookings.refundAmount")}</Text>
                    <Text style={styles.refundValue}>
                      {formatVnd(item.refund?.refundAmount)}
                      {item.refund?.refundPercent != null
                        ? ` (${item.refund.refundPercent}%)`
                        : ""}
                    </Text>
                  </Text>
                  <Text style={styles.refundRow}>
                    <Text style={styles.refundLabel}>{t("admin.bookings.refundBank")}</Text>
                    <Text style={styles.refundValue}>
                      {item.refund?.bankName?.trim() || "—"}
                    </Text>
                  </Text>
                  <Text style={styles.refundRow}>
                    <Text style={styles.refundLabel}>{t("admin.bookings.refundAccount")}</Text>
                    <Text style={styles.refundValueMono}>
                      {item.refund?.accountNumber?.trim() || "—"}
                    </Text>
                  </Text>
                  <Text style={styles.refundRow}>
                    <Text style={styles.refundLabel}>{t("admin.bookings.refundHolder")}</Text>
                    <Text style={styles.refundValue}>
                      {item.refund?.accountName?.trim() || "—"}
                    </Text>
                  </Text>
                  {item.payment?.status === "refund_pending" &&
                  item.refund?.accountNumber?.trim() ? (
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyRefundInfo(item)}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={14}
                        color={adminTheme.colors.onSurface}
                      />
                      <Text style={styles.copyBtnText}>{t("admin.bookings.copyInfo")}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.payment?.status === "refund_pending" &&
                  !item.refund?.bankName?.trim() &&
                  !item.refund?.accountNumber?.trim() ? (
                    <Text style={styles.refundWarning}>
                      {t("admin.bookings.missingBankInfo")}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {false && item.payment?.status === "refund_pending" ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionPrimary]}
                    onPress={() =>
                      Alert.alert(
                        t("admin.bookings.refundTitle"),
                        `Đã chuyển ${formatVnd(item.refund?.refundAmount)} cho ${item.refund?.accountName || t("common.noData")}?`,
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("admin.bookings.markRefunded"),
                            onPress: () => setStatusAction(item, "refunded"),
                          },
                        ],
                      )
                    }
                  >
                    <Text style={styles.actionTextPrimary}>{t("admin.bookings.markRefunded")}</Text>
                  </TouchableOpacity>
                </View>
              ) : false && MANAGEABLE_STATUSES.has(item.status) ? (
                <View style={styles.actionsRow}>
                  {item.status !== "confirmed" ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => setStatusAction(item, "confirmed")}
                    >
                      <Text style={styles.actionText}>{t("admin.bookings.confirm")}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.status === "confirmed" ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => setStatusAction(item, "paid")}
                    >
                      <Text style={styles.actionTextPrimary}>{t("admin.bookings.markPaid")}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => setStatusAction(item, "cancelled")}
                  >
                    <Text style={styles.actionTextDanger}>{t("admin.bookings.cancel")}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </AdminCard>
          )}
        />
      )}

      <AdminBottomNav />
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "warning" | "success" | "danger" | "info" | "default";
}) {
  return (
    <View
      style={[
        styles.statusBadge,
        tone === "warning" && styles.statusBadgeWarning,
        tone === "success" && styles.statusBadgeSuccess,
        tone === "danger" && styles.statusBadgeDanger,
        tone === "info" && styles.statusBadgeInfo,
      ]}
    >
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminTheme.colors.background,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  filterPanelTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.muted,
  },
  searchInput: {
    flex: 1,
    color: adminTheme.colors.onSurface,
    fontSize: 13,
  },
  filterActions: {
    flexDirection: "row",
    gap: 8,
  },
  resetBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: adminTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onPrimary,
  },
  filterGroup: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    fontWeight: "700",
    marginBottom: 8,
  },
  quickFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  quickFilterChipActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  quickFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  quickFilterTextActive: {
    color: adminTheme.colors.onPrimary,
  },
  loadingWrap: {
    marginTop: 30,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  loadMoreBtn: {
    marginTop: 4,
    marginBottom: 16,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  loadMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  statusBadgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeSuccess: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeInfo: {
    backgroundColor: "#DBEAFE",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 2,
  },
  refundBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceLow,
    gap: 4,
  },
  refundTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
    marginBottom: 4,
  },
  refundRow: {
    fontSize: 12,
    lineHeight: 18,
  },
  refundLabel: {
    color: adminTheme.colors.muted,
    fontWeight: "600",
  },
  refundValue: {
    color: adminTheme.colors.onSurface,
    fontWeight: "600",
  },
  refundValueMono: {
    color: adminTheme.colors.onSurface,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  refundWarning: {
    marginTop: 6,
    fontSize: 11,
    color: adminTheme.colors.danger,
    fontWeight: "600",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceLow,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionPrimary: {
    backgroundColor: adminTheme.colors.primary,
  },
  actionGhost: {
    backgroundColor: adminTheme.colors.surfaceLow,
  },
  actionDanger: {
    backgroundColor: adminTheme.colors.danger,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  actionTextPrimary: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onPrimary,
  },
  actionTextDanger: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onDanger,
  },
});

