import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { bookingAPI, partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";

type OrderStatus = "all" | "pending" | "confirmed" | "cancelled";

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
  confirmed: number;
  cancelled: number;
}

const EMPTY_COUNTS: OrderCounts = {
  all: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  pending_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  paid: "Đã thanh toán",
  completed: "Hoàn thành",
};

const STATUS_STYLES: Record<
  string,
  { color: string; backgroundColor: string; borderColor?: string }
> = {
  pending: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  pending_payment: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  confirmed: { color: "#22C55E", backgroundColor: "#E7F8EE" },
  cancelled: {
    color: "#F04444",
    backgroundColor: "#FEE2E2",
    borderColor: "#F04444",
  },
};

const FILTER_ACTIVE_STYLES: Record<
  Exclude<OrderStatus, "all">,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  pending: {
    backgroundColor: "#FFF7E2",
    borderColor: "#F2CF75",
    textColor: "#E69A00",
  },
  confirmed: {
    backgroundColor: "#E7F8EE",
    borderColor: "#7DDF9E",
    textColor: "#22C55E",
  },
  cancelled: {
    backgroundColor: "#FEE2E2",
    borderColor: "#F04444",
    textColor: "#F04444",
  },
};

export default function PartnerOrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<OrderStatus>("all");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadOrders = async (status: OrderStatus) => {
    try {
      const res = await partnerDashboardAPI.getOrders(status);
      setOrders(res.data?.orders || []);
      setCounts(res.data?.counts || EMPTY_COUNTS);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không tải được đơn đặt bàn";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
      setSubmittingId(null);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadOrders(activeFilter);
  }, [activeFilter]);

  const filterTabs = useMemo(
    () => [
      { key: "all" as OrderStatus, label: `Tất cả (${counts.all})` },
      { key: "pending" as OrderStatus, label: `Chờ (${counts.pending})` },
      {
        key: "confirmed" as OrderStatus,
        label: `Đã xác nhận (${counts.confirmed})`,
      },
      {
        key: "cancelled" as OrderStatus,
        label: `Đã hủy (${counts.cancelled})`,
      },
    ],
    [counts],
  );

  const pendingCount = counts.pending || 0;

  const handleConfirm = async (orderId: string) => {
    try {
      setSubmittingId(orderId);
      await bookingAPI.confirm(orderId);
      await loadOrders(activeFilter);
    } catch (error: any) {
      setSubmittingId(null);
      const message =
        error?.response?.data?.message || "Không thể xác nhận đơn";
      Alert.alert("Lỗi", message);
    }
  };

  const handleReject = (orderId: string) => {
    Alert.alert("Từ chối đơn", "Bạn chắc chắn muốn từ chối đơn đặt bàn này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Từ chối",
        style: "destructive",
        onPress: async () => {
          try {
            setSubmittingId(orderId);
            await bookingAPI.cancel(orderId, "Partner từ chối đơn");
            await loadOrders(activeFilter);
          } catch (error: any) {
            setSubmittingId(null);
            const message =
              error?.response?.data?.message || "Không thể từ chối đơn";
            Alert.alert("Lỗi", message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerTitle}>Đơn đặt bàn</Text>
          <Text style={styles.headerSub}>Theo dõi và xử lý theo trạng thái</Text>
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
          const activeStyle =
            tab.key !== "all" && isActive
              ? FILTER_ACTIVE_STYLES[tab.key]
              : undefined;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                activeStyle && {
                  backgroundColor: activeStyle.backgroundColor,
                  borderColor: activeStyle.borderColor,
                },
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
                  isActive && tab.key === "all" && styles.filterTextAllActive,
                  activeStyle && { color: activeStyle.textColor },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>Đang tải đơn đặt bàn...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Không có đơn phù hợp</Text>
            <Text style={styles.helperText}>
              Thử chọn bộ lọc khác để xem thêm.
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusLabel = STATUS_LABELS[order.status] || order.status;
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
                  <Text style={styles.metaText}>Mã: {order.bookingNumber}</Text>
                  <Text style={styles.metaText}>SĐT: {order.userPhone || "--"}</Text>
                  <Text style={styles.metaText}>
                    {order.tableNumber} • {order.date} • {order.time}
                  </Text>
                  <Text style={styles.metaTextStrong}>
                    {order.guests} khách • Cọc {order.depositAmount.toLocaleString("vi-VN")}đ
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
                      <Text style={styles.rejectText}>Từ chối</Text>
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
                        {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
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
  filterGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  filterTextAllActive: { color: "#fff" },
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
