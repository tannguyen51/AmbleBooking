import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { bookingAPI, partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { useTranslation } from "../../i18n/useTranslation";

type OrderStatus = "all" | "pending" | "completed" | "cancelled";

interface PartnerOrder {
  id: string;
  bookingNumber: string;
  status: string;
  userName: string;
  userPhone: string;
  tableNumber: string;
  tableType: string;
  date: string;
  time: string;
  guests: number;
  depositAmount: number;
  totalAmount: number;
  bookedAt: string;
}

interface OrderCounts {
  all: number;
  pending: number;
  completed: number;
  cancelled: number;
}

const EMPTY_COUNTS: OrderCounts = {
  all: 0,
  pending: 0,
  completed: 0,
  cancelled: 0,
};

const STATUS_STYLES: Record<
  string,
  { color: string; backgroundColor: string; borderColor?: string }
> = {
  pending: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  pending_payment: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  confirmed: { color: "#22C55E", backgroundColor: "#E7F8EE" },
  completed: { color: "#22C55E", backgroundColor: "#E7F8EE" },
  cancelled: {
    color: "#F04444",
    backgroundColor: "#FEE2E2",
    borderColor: "#F04444",
  },
};

export default function PartnerOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<OrderStatus>("all");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState("");

  const getStatusLabel = (status: string): string => {
    const statusKeys: Record<string, string> = {
      pending: t("partner.orders.statusPending"),
      pending_payment: t("partner.orders.statusPendingPayment"),
      confirmed: t("partner.orders.statusCompleted"),
      cancelled: t("partner.orders.statusCancelled"),
      paid: t("partner.orders.statusPaid"),
      completed: t("partner.orders.statusCompleted"),
    };
    return statusKeys[status] || status;
  };

  const loadOrders = async (status: OrderStatus) => {
    try {
      const res = await partnerDashboardAPI.getOrders(status);
      setOrders(res.data?.orders || []);
      setCounts(res.data?.counts || EMPTY_COUNTS);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không tải được đơn đặt bàn";
      Alert.alert(t("common.error"), message);
    } finally {
      setIsLoading(false);
      setSubmittingId(null);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadOrders(activeFilter);
  }, [activeFilter]);

  const filterTabs = [
    { key: "all" as OrderStatus, label: `${t("partner.orders.tabAll")} (${counts.all})` },
    { key: "pending" as OrderStatus, label: `${t("partner.orders.tabPending")} (${counts.pending})` },
    { key: "completed" as OrderStatus, label: `${t("partner.orders.tabCompleted")} (${counts.completed})` },
    { key: "cancelled" as OrderStatus, label: `${t("partner.orders.tabCancelled")} (${counts.cancelled})` },
  ];

  const pendingCount = counts.pending || 0;
  const filteredOrders = useMemo(() => {
    const keyword = searchCode.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((order) =>
      String(order.bookingNumber || "").toLowerCase().includes(keyword),
    );
  }, [orders, searchCode]);

  const handleConfirm = async (orderId: string) => {
    try {
      setSubmittingId(orderId);
      await bookingAPI.confirm(orderId);
      await loadOrders(activeFilter);
    } catch (error: any) {
      setSubmittingId(null);
      const message =
        error?.response?.data?.message || t("partner.orders.confirmError");
      Alert.alert(t("common.error"), message);
    }
  };

  const handleReject = (orderId: string) => {
    Alert.alert(t("partner.orders.rejectTitle"), t("partner.orders.rejectConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("partner.dashboard.reject"),
        style: "destructive",
        onPress: async () => {
          try {
            setSubmittingId(orderId);
            await bookingAPI.cancel(orderId, "Partner từ chối đơn");
            await loadOrders(activeFilter);
          } catch (error: any) {
            setSubmittingId(null);
            const message =
              error?.response?.data?.message || t("partner.orders.rejectError");
            Alert.alert(t("common.error"), message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerTitle}>{t("partner.orders.title")}</Text>
          <Text style={styles.headerSub}>{t("partner.orders.subtitle")}</Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/dashboard")}
        >
          <Ionicons name="home-outline" size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              {isActive && tab.key === "all" && (
                <LinearGradient
                  colors={["#ff8b25", "#ffd109"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterGradient}
                />
              )}
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("partner.orders.searchPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={searchCode}
            onChangeText={setSearchCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {!!searchCode && (
            <TouchableOpacity onPress={() => setSearchCode("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>{t("common.loading")}</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>{t("partner.orders.emptyTitle")}</Text>
            <Text style={styles.helperText}>
              {t("partner.orders.emptySubtitle")}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusLabel = getStatusLabel(order.status);
            const isPending = order.status === "pending";
            const isSubmitting = submittingId === order.id;
            const statusStyle = STATUS_STYLES[order.status];
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <Text style={styles.customerName}>{order.userName}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      statusStyle && {
                        color: statusStyle.color,
                        backgroundColor: statusStyle.backgroundColor,
                        borderColor: statusStyle.borderColor,
                        borderWidth: statusStyle.borderColor ? 1 : 0,
                      },
                    ]}
                  >
                    {statusLabel}
                  </Text>
                </View>

                <View style={styles.metaGrid}>
                  <Text style={styles.metaText}>{t("partner.orders.code", { code: order.bookingNumber })}</Text>
                  <Text style={styles.metaText}>{t("partner.orders.phone", { phone: order.userPhone || "--" })}</Text>
                  <Text style={styles.metaText}>
                    {order.tableNumber} • {order.date} • {order.time}
                  </Text>
                  <Text style={styles.metaTextStrong}>
                    {t("partner.orders.metadata", { guests: order.guests, deposit: order.depositAmount.toLocaleString("vi-VN") })}
                  </Text>
                </View>

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.rejectBtn,
                        isSubmitting && styles.disabledBtn,
                      ]}
                      onPress={() => handleReject(order.id)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.rejectText}>{t("partner.dashboard.reject")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        isSubmitting && styles.disabledBtn,
                      ]}
                      onPress={() => handleConfirm(order.id)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.confirmText}>
                        {isSubmitting ? t("partner.orders.processing") : t("partner.dashboard.confirm")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <PartnerBottomNav pendingCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  headerSub: { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "500" },
  backBtn: {
    width: 34,
    height: 34,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filterScroll: { maxHeight: 56 },
  filterRow: {
    paddingHorizontal: 18,
    paddingRight: 20,
    gap: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  filterChip: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6EAF0",
  },
  filterChipActive: {
    backgroundColor: "#FFF7E2",
    borderColor: "#F2CF75",
  },
  filterGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  filterTextActive: { color: "#E69A00" },
  searchWrap: { paddingHorizontal: 18, paddingBottom: 6 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6EAF0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 0,
  },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 8, gap: 12, paddingBottom: 24 },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  helperText: { fontSize: 12, color: "#9CA3AF" },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    padding: 13,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  customerName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  statusBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaGrid: { gap: 2 },
  metaText: { fontSize: 12, color: "#6B7280" },
  metaTextStrong: { fontSize: 12, color: "#374151", fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    paddingVertical: 11,
    alignItems: "center",
  },
  rejectText: { fontSize: 13, fontWeight: "800", color: "#DC2626" },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    paddingVertical: 11,
    alignItems: "center",
  },
  confirmText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  disabledBtn: { opacity: 0.6 },
});
