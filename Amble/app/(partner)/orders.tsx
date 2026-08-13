import React, { useCallback, useMemo, useState } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { bookingAPI, partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import ReleaseModal from "../../components/partner/ReleaseModal";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { timeAgo } from "../../utils/timeAgo";

type OrderStatus = "all" | "booked" | "completed" | "no_show";

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
  bookedAt?: string;
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
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  occupied: "Đang dùng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  no_show: "Vắng mặt",
};

const STATUS_STYLES: Record<string, { color: string; backgroundColor: string }> = {
  pending: { color: "#B54708", backgroundColor: "#FFFAEB" },
  confirmed: { color: "#067647", backgroundColor: "#F0FDF4" },
  occupied: { color: "#D92D20", backgroundColor: "#FEF2F2" },
  completed: { color: "#475467", backgroundColor: "#F2F4F7" },
  cancelled: { color: "#D92D20", backgroundColor: "#FEE4E2" },
  no_show: { color: "#475467", backgroundColor: "#F2F4F7" },
};

const FILTER_CONFIG = [
  { key: "all" as OrderStatus, label: "Tất cả", icon: "apps-outline" },
  { key: "booked" as OrderStatus, label: "Đã đặt", icon: "calendar-outline" },
  { key: "no_show" as OrderStatus, label: "No-show", icon: "close-circle-outline" },
  { key: "completed" as OrderStatus, label: "Hoàn thành", icon: "checkmark-done-outline" },
];

export default function PartnerOrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<OrderStatus>("all");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Tab "Hoàn thành"/"No-show" tải theo status riêng; các tab còn lại tải toàn bộ
  const orderStatusParam = (filter: OrderStatus) =>
    filter === "completed" || filter === "no_show" ? filter : "all";

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
    return ["pending", "confirmed"].includes(status);
  };
  const canConfirm = (status: string) => ["pending"].includes(status);
  const canCheckIn = (status: string) => ["confirmed"].includes(status);
  const canComplete = (status: string) => ["occupied"].includes(status);
  const canDecline = (status: string) => ["pending"].includes(status);
  const canNoShow = (status: string) => {
    if (!["owner", "manager"].includes(partner?.role || "")) return false;
    return ["pending", "confirmed"].includes(status);
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadOrders(orderStatusParam(activeFilter));
    }, [activeFilter])
  );

  const displayedOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    // Ẩn hoàn toàn các đơn đã hủy
    const base = orders.filter((o) => o.status !== "cancelled");
    let filtered = base;
    if (activeFilter === "booked") {
      filtered = base.filter((o) => !["cancelled", "no_show"].includes(o.status));
    } else if (activeFilter === "no_show") {
      filtered = base.filter((o) => o.status === "no_show");
    } else if (activeFilter === "completed") {
      filtered = base.filter((o) => o.status === "completed");
    }
    // Sắp xếp từ gần nhất đến xa nhất (theo ngày + giờ đặt)
    filtered = [...filtered].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
    if (!keyword) return filtered;
    return filtered.filter((o) =>
      o.bookingNumber.toLowerCase().includes(keyword) ||
      o.userName.toLowerCase().includes(keyword) ||
      o.userPhone.toLowerCase().includes(keyword) ||
      o.tableNumber.toLowerCase().includes(keyword)
    );
  }, [activeFilter, orders, searchText]);

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
      loadOrders(orderStatusParam(activeFilter));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể check-in.");
    }
  };

  const handleNoShow = async (bookingId: string) => {
    Alert.alert("Xác nhận No-show", "Khách không đến?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "No-show",
        style: "destructive",
        onPress: async () => {
          try {
            await partnerDashboardAPI.releaseBooking(bookingId, { reason: "no_show" });
            Alert.alert("Thành công", "Đã đánh dấu No-show.");
            loadOrders(orderStatusParam(activeFilter));
          } catch (error: any) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể đánh dấu No-show.");
          }
        },
      },
    ]);
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      await bookingAPI.confirm(bookingId);
      Alert.alert("Thành công", "Đã xác nhận đơn đặt bàn.");
      loadOrders(orderStatusParam(activeFilter));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xác nhận.");
    }
  };

  const handleComplete = async (bookingId: string) => {
    try {
      await partnerDashboardAPI.completeBooking(bookingId);
      Alert.alert("Thành công", "Bàn đã được giải phóng.");
      loadOrders(orderStatusParam(activeFilter));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể hoàn tất.");
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      await partnerDashboardAPI.declineBooking(bookingId);
      Alert.alert("Thành công", "Đã từ chối booking.");
      loadOrders(orderStatusParam(activeFilter));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể từ chối.");
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

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={15} color="#9CA3AF" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm theo mã đơn, tên, SĐT..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
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
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={isActive ? "#fff" : "#475467"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {tab.label}
              </Text>
              {tab.key === "completed" && counts.completed > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                    {counts.completed}
                  </Text>
                </View>
              )}
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
            const canConfirmOrder = canConfirm(order.status);
            const canCheckInOrder = canCheckIn(order.status);
            const canCompleteOrder = canComplete(order.status);
            const canDeclineOrder = canDecline(order.status);
            const canNoShowOrder = canNoShow(order.status);

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
                  {order.bookedAt && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                      <Text style={styles.metaText}>{timeAgo(order.bookedAt)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.orderActions}>
                  {canConfirmOrder && (
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => handleConfirm(order.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.confirmBtnTxt}>Xác nhận</Text>
                    </TouchableOpacity>
                  )}
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
                  {canNoShowOrder && (
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleNoShow(order.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-off-outline" size={16} color="#EF4444" />
                      <Text style={styles.declineBtnTxt}>No-show</Text>
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
                  {canDeclineOrder && (
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleDecline(order.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-outline" size={16} color="#EF4444" />
                      <Text style={styles.declineBtnTxt}>Từ chối</Text>
                    </TouchableOpacity>
                  )}
                  {canCompleteOrder && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleComplete(order.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                      <Text style={styles.completeBtnTxt}>Check-out</Text>
                    </TouchableOpacity>
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
        onSuccess={() => loadOrders(orderStatusParam(activeFilter))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F5F7" },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F4F5F7",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#101828" },
  headerSub: { marginTop: 2, fontSize: 12, color: "#667085", fontWeight: "500" },
  backBtn: {
    width: 34, height: 34, backgroundColor: "#FFFFFF", borderRadius: 17,
    borderWidth: 1, borderColor: "#E4E7EC", alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: "#E4E7EC",
    paddingHorizontal: 12, marginBottom: 2, gap: 8, marginTop: 6,
  },
  searchInput: {
    flex: 1, paddingVertical: 8, color: "#101828", fontSize: 13,
  },
  filterRow: {
    paddingHorizontal: 18, gap: 8, paddingVertical: 10, flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 999, paddingHorizontal: 14, height: 34,
    backgroundColor: "#F2F4F7",
  },
  filterChipActive: {
    backgroundColor: "#1A1C29",
  },
  filterText: {
    fontSize: 12, fontWeight: "700", color: "#475467",
  },
  filterTextActive: { color: "#FFFFFF" },
  countBadge: {
    marginLeft: 6, minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 5, backgroundColor: "#E4E7EC",
    alignItems: "center", justifyContent: "center",
  },
  countBadgeActive: { backgroundColor: "#FF6B35" },
  countBadgeText: { fontSize: 10, fontWeight: "800", color: "#475467" },
  countBadgeTextActive: { color: "#FFFFFF" },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 6, gap: 10, paddingBottom: 24 },
  centerBox: { alignItems: "center", justifyContent: "center", paddingVertical: 36, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#101828" },
  helperText: { fontSize: 12, color: "#667085" },
  orderCard: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 0,
    padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  orderTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  customerName: { fontSize: 16, fontWeight: "800", color: "#101828" },
  statusBadge: {
    fontSize: 11, fontWeight: "700", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden",
  },
  metaGrid: { gap: 5, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, color: "#344054", flex: 1, fontWeight: "500" },
  orderActions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F0F1F3", paddingTop: 10 },
  confirmBtn: {
    flex: 1, height: 36, borderRadius: 10,
    backgroundColor: "#1A1C29",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  confirmBtnTxt: { fontSize: 12, fontWeight: "800", color: "#fff" },
  checkInBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  checkInBtnTxt: { fontSize: 12, fontWeight: "800", color: "#16A34A" },
  releaseBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA",
    backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  releaseBtnTxt: { fontSize: 12, fontWeight: "800", color: "#D92D20" },
  declineBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA",
    backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  declineBtnTxt: { fontSize: 12, fontWeight: "800", color: "#D92D20" },
  completeBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
  },
  completeBtnTxt: { fontSize: 12, fontWeight: "800", color: "#16A34A" },
});
