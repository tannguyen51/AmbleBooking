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
import { partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";

type OrderStatus = "all" | "booked" | "cancelled";

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
  cancelled: number;
}

const EMPTY_COUNTS: OrderCounts = {
  all: 0,
  cancelled: 0,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
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
  booked: {
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

  const loadOrders = async (status: "all" | "cancelled") => {
    try {
      const res = await partnerDashboardAPI.getOrders(status);
      setOrders(res.data?.orders || []);
      const rawCounts = res.data?.counts || {};
      setCounts({
        all: Number(rawCounts.all || 0),
        cancelled: Number(rawCounts.cancelled || 0),
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không tải được đơn đặt bàn";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadOrders(activeFilter === "cancelled" ? "cancelled" : "all");
  }, [activeFilter]);

  const filterTabs = useMemo(
    () => [
      { key: "all" as OrderStatus, label: `Tất cả (${counts.all})` },
      {
        key: "booked" as OrderStatus,
        label: `Đã đặt bàn (${Math.max(0, counts.all - counts.cancelled)})`,
      },
      {
        key: "cancelled" as OrderStatus,
        label: `Đã hủy (${counts.cancelled})`,
      },
    ],
    [counts],
  );

  const displayedOrders = useMemo(() => {
    if (activeFilter === "booked") {
      return orders.filter((o) => o.status !== "cancelled");
    }
    return orders;
  }, [activeFilter, orders]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerTitle}>Đơn đặt bàn</Text>
          <Text style={styles.headerSub}>Theo dõi trạng thái theo luồng khách hàng</Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/dashboard")}
        >
          <Ionicons name="home-outline" size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
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
      </View>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>Đang tải đơn đặt bàn...</Text>
          </View>
        ) : displayedOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Không có đơn phù hợp</Text>
            <Text style={styles.helperText}>
              Thử chọn bộ lọc khác để xem thêm.
            </Text>
          </View>
        ) : (
          displayedOrders.map((order) => {
            const statusLabel = STATUS_LABELS[order.status] || order.status;
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
              </View>
            );
          })
        )}
      </ScrollView>

      <PartnerBottomNav pendingCount={0} />
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
  filterRow: {
    paddingHorizontal: 18,
    gap: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "stretch",
  },
  filterChip: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6EAF0",
    alignItems: "center",
    flex: 1,
  },
  filterGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterText: { fontSize: 12, fontWeight: "700", color: "#4B5563", textAlign: "center" },
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
});
