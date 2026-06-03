import React, { useCallback, useMemo, useState } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import ReleaseModal from "../../components/partner/ReleaseModal";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";

type OrderStatus = "all" | "booked" | "cancelled" | "no_show" | "released";

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
  completed: number;
  cancelled: number;
}

const EMPTY_COUNTS: OrderCounts = {
  all: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  pending_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  paid: "Đã thanh toán",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  released: "Đã release",
  no_show: "No-show",
};

const STATUS_STYLES: Record<string, { color: string; backgroundColor: string; borderColor?: string }> = {
  pending: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  pending_payment: { color: "#E69A00", backgroundColor: "#FFF7E2" },
  confirmed: { color: "#22C55E", backgroundColor: "#E7F8EE" },
  paid: { color: "#3B82F6", backgroundColor: "#EFF6FF" },
  completed: { color: "#22C55E", backgroundColor: "#E7F8EE" },
  cancelled: { color: "#F04444", backgroundColor: "#FEE2E2", borderColor: "#F04444" },
  released: { color: "#8B5CF6", backgroundColor: "#F5F3FF", borderColor: "#C4B5FD" },
  no_show: { color: "#EF4444", backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
};

const FILTER_CONFIG = [
  { key: "all" as OrderStatus, label: "Tất cả", icon: "apps-outline" },
  { key: "booked" as OrderStatus, label: "Đã đặt", icon: "calendar-outline" },
  { key: "no_show" as OrderStatus, label: "No-show", icon: "close-circle-outline" },
  { key: "cancelled" as OrderStatus, label: "Đã hủy", icon: "trash-outline" },
];

export default function PartnerOrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<OrderStatus>("all");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);

  // Release modal state
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const loadOrders = async (status: string) => {
    try {
      const res = await partnerDashboardAPI.getOrders(status);
      setOrders(res.data?.orders || []);
      const rawCounts = res.data?.counts || {};
      setCounts({
        all: Number(rawCounts.all || 0),
        pending: Number(rawCounts.pending || 0),
        confirmed: Number(rawCounts.confirmed || 0),
        completed: Number(rawCounts.completed || 0),
        cancelled: Number(rawCounts.cancelled || 0),
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không tải được đơn đặt bàn";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
    }
  };

  const { partner } = usePartnerAuthStore();
  const canRelease = (status: string) => {
    if (!["owner", "manager"].includes(partner?.role || "")) return false;
    return ["pending", "confirmed", "paid"].includes(status);
  };
  const canCheckIn = (status: string) => ["confirmed", "paid"].includes(status);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadOrders(activeFilter === "cancelled" ? "cancelled" : "all");
    }, [activeFilter])
  );

  const displayedOrders = useMemo(() => {
    if (activeFilter === "booked") {
      return orders.filter((o) => !["cancelled", "released", "no_show"].includes(o.status));
    }
    if (activeFilter === "no_show") {
      return orders.filter((o) => o.status === "no_show" || o.status === "released");
    }
    if (activeFilter === "cancelled") {
      return orders.filter((o) => o.status === "cancelled");
    }
    return orders;
  }, [activeFilter, orders]);

  const openReleaseModal = (order: PartnerOrder) => {
    setSelectedBooking({
      id: order.id,
      bookingNumber: order.bookingNumber,
      tableNumber: order.tableNumber,
      userName: order.userName,
      date: order.date,
      time: order.time,
    });
    setReleaseModalVisible(true);
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await partnerDashboardAPI.checkInBooking(bookingId);
      Alert.alert("Thành công", "Khách đã check-in.");
      loadOrders(activeFilter === "cancelled" ? "cancelled" : "all");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể check-in.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerTitle}>Đơn đặt bàn</Text>
          <Text style={styles.headerSub}>Theo dõi trạng thái theo luồng khách hàng</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(partner)/dashboard")}>
          <Ionicons name="home-outline" size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTER_CONFIG.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              {isActive && (
                <LinearGradient
                  colors={["#ff8b25", "#ffd109"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterGradient}
                />
              )}
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={isActive ? "#fff" : "#6B7280"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextAllActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.listWrap} contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>Đang tải đơn đặt bàn...</Text>
          </View>
        ) : displayedOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không có đơn phù hợp</Text>
            <Text style={styles.helperText}>Thử chọn bộ lọc khác để xem thêm.</Text>
          </View>
        ) : (
          displayedOrders.map((order) => {
            const statusLabel = STATUS_LABELS[order.status] || order.status;
            const statusStyle = STATUS_STYLES[order.status];
            const canReleaseOrder = canRelease(order.status);
            const canCheckInOrder = canCheckIn(order.status);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{order.userName}</Text>
                  </View>
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
                  <View style={styles.metaRow}>
                    <Ionicons name="receipt-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>Mã: {order.bookingNumber}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>SĐT: {order.userPhone || "--"}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="restaurant-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                      {order.tableNumber} • {order.date} • {order.time}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                      {order.guests} khách • Cọc {order.depositAmount.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                </View>

                <View style={styles.orderActions}>
                  {canCheckInOrder && (
                    <TouchableOpacity
                      style={styles.checkInBtn}
                      onPress={() => handleCheckIn(order.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="enter-outline" size={16} color="#22C55E" />
                      <Text style={styles.checkInBtnTxt}>Check-in</Text>
                    </TouchableOpacity>
                  )}
                  {canReleaseOrder && (
                    <TouchableOpacity
                      style={styles.releaseBtn}
                      onPress={() => openReleaseModal(order)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.releaseBtnTxt}>Release</Text>
                    </TouchableOpacity>
                  )}
                  {!canReleaseOrder && !canCheckInOrder && (
                    <Text style={styles.noActionText}>{STATUS_LABELS[order.status] || order.status}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PartnerBottomNav pendingCount={counts.pending} />

      {/* Release Modal */}
      <ReleaseModal
        visible={releaseModalVisible}
        booking={selectedBooking}
        onClose={() => setReleaseModalVisible(false)}
        onSuccess={() => loadOrders(activeFilter === "cancelled" ? "cancelled" : "all")}
      />
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
    width: 34, height: 34, backgroundColor: "#FFFFFF", borderRadius: 17,
    borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center",
  },
  filterRow: {
    paddingHorizontal: 18, gap: 8, paddingVertical: 10, flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    overflow: "hidden", borderRadius: 999, paddingHorizontal: 12, height: 36,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E6EAF0", flex: 1,
  },
  filterChipActive: { borderColor: "#FF6B35" },
  filterGradient: { ...StyleSheet.absoluteFillObject },
  filterText: {
    fontSize: 12, fontWeight: "700", color: "#4B5563",
  },
  filterTextAllActive: { color: "#fff" },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 8, gap: 10, paddingBottom: 24 },
  centerBox: { alignItems: "center", justifyContent: "center", paddingVertical: 36, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  helperText: { fontSize: 12, color: "#9CA3AF" },
  orderCard: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E8EDF3",
    padding: 14, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  orderTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  },
  customerName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  statusBadge: {
    fontSize: 10, fontWeight: "800", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, overflow: "hidden",
  },
  metaGrid: { gap: 4, marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#6B7280", flex: 1 },
  orderActions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  checkInBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  checkInBtnTxt: { fontSize: 12, fontWeight: "800", color: "#22C55E" },
  releaseBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA",
    backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  releaseBtnTxt: { fontSize: 12, fontWeight: "800", color: "#EF4444" },
  noActionText: { flex: 1, textAlign: "center", fontSize: 12, color: "#9CA3AF", fontStyle: "italic" },
});
