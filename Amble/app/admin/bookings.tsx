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
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";

interface BookingItem {
  _id: string;
  bookingNumber: string;
  status: string;
  bookingDetails?: { date?: string; time?: string; partySize?: number };
  userId?: { fullName?: string; email?: string };
  restaurantId?: { name?: string };
  tableId?: { name?: string };
}

const STATUS_TABS = [
  "pending",
  "pending_payment",
  "confirmed",
  "paid",
  "completed",
  "cancelled",
  "refund_pending",
  "refunded",
  "all",
];

export default function AdminBookingsScreen() {
  const [status, setStatus] = useState<string>("pending");
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
      const nextPage = reset ? 1 : page;
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

  const setStatusAction = async (item: BookingItem, nextStatus: string) => {
    try {
      await adminAPI.updateBookingStatus(item._id, { status: nextStatus });
      await loadBookings();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Bookings" subtitle="Theo dõi và cập nhật" />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã booking"
          placeholderTextColor={adminTheme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadBookings(true)}
        />
        <TextInput
          style={styles.dateInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={adminTheme.colors.muted}
          value={date}
          onChangeText={setDate}
          onSubmitEditing={() => loadBookings(true)}
        />
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadBookings(true)}
        >
          <Ionicons name="refresh" size={16} color={adminTheme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setStatus(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
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
                <Text style={styles.loadMoreText}>Tải thêm</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.bookingNumber}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.meta}>
                {item.restaurantId?.name || "Nhà hàng"} • {item.tableId?.name || "Bàn"}
              </Text>
              <Text style={styles.meta}>
                {item.userId?.fullName || "Khách hàng"} • {item.bookingDetails?.date || ""} {item.bookingDetails?.time || ""}
              </Text>
              {item.status === "refund_pending" ? (
                <Text style={styles.metaStrong}>
                  Refund: {(item as any)?.refund?.refundAmount || 0}đ
                </Text>
              ) : null}

              <View style={styles.actionsRow}>
                {item.status === "refund_pending" ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionPrimary]}
                    onPress={() => setStatusAction(item, "refunded")}
                  >
                    <Text style={styles.actionTextPrimary}>Mark refunded</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => setStatusAction(item, "confirmed")}
                    >
                      <Text style={styles.actionText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => setStatusAction(item, "paid")}
                    >
                      <Text style={styles.actionTextPrimary}>Mark paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDanger]}
                      onPress={() => setStatusAction(item, "cancelled")}
                    >
                      <Text style={styles.actionTextDanger}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </AdminCard>
          )}
        />
      )}

      <AdminBottomNav />
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
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: adminTheme.colors.onSurface,
    fontSize: 13,
  },
  dateInput: {
    width: 110,
    color: adminTheme.colors.onSurface,
    fontSize: 12,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  tabActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  tabText: {
    fontSize: 11,
    color: adminTheme.colors.onSurface,
    fontWeight: "600",
  },
  tabTextActive: {
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
    paddingVertical: 16,
    gap: 12,
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
  status: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 2,
  },
  metaStrong: {
    fontSize: 12,
    color: adminTheme.colors.onSurface,
    marginTop: 4,
    fontWeight: "700",
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
    color: adminTheme.colors.danger,
  },
});
