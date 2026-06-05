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
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { useTranslation } from "../../i18n/useTranslation";
import Svg, { Rect, Line, Circle, Polyline, Text as SvgText } from "react-native-svg";

interface Restaurant {
  _id: string;
  name: string;
  city?: string;
  cuisine?: string;
  isActive?: boolean;
  images?: string[];
  subscriptionPackage?: string;
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

  // Revenue
  const [revenue, setRevenue] = useState<{ activeBookings: number; totalRevenue: number; monthlyData: Array<{ month: number; total: number; count: number }> } | null>(null);

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

  // Load bookings + revenue when restaurant or search changes
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
        const all = res.data?.bookings || [];
        setBookings(all.filter((b: BookingItem) => !["cancelled", "declined", "no_show"].includes(b.status)));
        // Doanh thu không block danh sách đơn
        adminAPI.getRestaurantRevenue(selectedRestId).then(revRes => {
          setRevenue(revRes.data?.data || null);
        }).catch((err) => {
          if (__DEV__) console.warn("[revenue] fetch error:", err?.message);
        });
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
                  {item.isActive && item.subscriptionPackage === "premium" && (
                    <View style={styles.crownBadgeSmall}>
                      <Ionicons name="diamond" size={10} color="#fff" />
                    </View>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Revenue Summary Cards */}
        {revenue && (
          <View style={styles.revenueCards}>
            <View style={[styles.revCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Text style={[styles.revValue, { color: '#067647' }]}>{revenue.activeBookings}</Text>
              <Text style={[styles.revLabel, { color: '#067647' }]}>Đơn active</Text>
            </View>
            <View style={[styles.revCard, { backgroundColor: '#FFFAEB', borderColor: '#FDE68A' }]}>
              <Text style={[styles.revValue, { color: '#B54708' }]}>{(revenue.totalRevenue / 1000000).toFixed(1)}M</Text>
              <Text style={[styles.revLabel, { color: '#B54708' }]}>Doanh thu</Text>
            </View>
            <View style={[styles.revCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.revValue, { color: '#1D4ED8' }]}>{revenue.monthlyData.length > 0 ? revenue.monthlyData.reduce((s: number, m: any) => s + m.count, 0) : 0}</Text>
              <Text style={[styles.revLabel, { color: '#1D4ED8' }]}>Đã HT</Text>
            </View>
          </View>
        )}

        {/* Financial Summary */}
        {revenue && (
          <View style={styles.finCard}>
            <View style={styles.finRow}>
              <View style={styles.finLeft}><View style={[styles.finDot, { backgroundColor: "#FB923C" }]} /><Text style={styles.finLabel}>Doanh thu</Text></View>
              <Text style={styles.finValue}>{(revenue.totalRevenue / 1000000).toFixed(1)} tr</Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finRow}>
              <View style={styles.finLeft}><View style={[styles.finDot, { backgroundColor: "#F87171" }]} /><Text style={styles.finLabel}>Chi phí (ước)</Text></View>
              <Text style={styles.finValue}>{Math.round(revenue.totalRevenue * 0.4 / 1000000).toFixed(1)} tr</Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finRow}>
              <View style={styles.finLeft}><View style={[styles.finDot, { backgroundColor: "#22C55E" }]} /><Text style={styles.finLabel}>Lợi nhuận</Text></View>
              <Text style={[styles.finValue, { color: "#22C55E" }]}>{(revenue.totalRevenue * 0.6 / 1000000).toFixed(1)} tr</Text>
            </View>
          </View>
        )}

        {/* Trend Chart */}
        {revenue?.monthlyData?.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>XU HƯỚNG</Text>
              <Text style={styles.chartSubtitle}>(triệu đồng)</Text>
            </View>
            <Svg width={Math.max(280, revenue.monthlyData.length * 70)} height={180}>
              {(() => {
                const data = revenue.monthlyData;
                const max = Math.max(...data.map((d: any) => d.total), 1);
                const pad = { top: 20, bottom: 24, left: 20, right: 10 };
                const plotW = (Math.max(280, data.length * 70) - pad.left - pad.right);
                const plotH = 180 - pad.top - pad.bottom;
                const gap = plotW / data.length;
                const bw = Math.min(20, gap * 0.4);
                const getY = (v: number) => pad.top + ((max - v) / max) * plotH;
                const pts = data.map((d: any, i: number) => `${pad.left + i * gap + gap / 2},${getY(d.total)}`).join(" ");
                const months = ["", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
                return (
                  <>
                    {[0, 0.5, 1].map((r: number) => (
                      <Line key={r} x1={pad.left} y1={pad.top + r * plotH} x2={pad.left + plotW} y2={pad.top + r * plotH} stroke="#E4E7EC" strokeWidth={0.5} />
                    ))}
                    {data.map((d: any, i: number) => {
                      const cx = pad.left + i * gap + gap / 2;
                      const bh = (d.total / max) * plotH;
                      return (
                        <React.Fragment key={i}>
                          <Rect x={cx - bw / 2} y={getY(d.total)} width={bw} height={Math.max(bh, 1)} rx={3} fill="#FB923C" opacity={0.85} />
                          <SvgText x={cx} y={getY(d.total) - 6} fill="#101828" fontSize={9} fontWeight="700" textAnchor="middle">{(d.total / 1000000).toFixed(1)}</SvgText>
                          <SvgText x={cx} y={180 - 4} fill="#6B7280" fontSize={9} fontWeight="600" textAnchor="middle">{months[d.month] || d.month}</SvgText>
                        </React.Fragment>
                      );
                    })}
                    <Polyline points={pts} fill="none" stroke="#22C55E" strokeWidth={2} />
                    {data.map((d: any, i: number) => (
                      <Circle key={i} cx={pad.left + i * gap + gap / 2} cy={getY(d.total)} r={3} fill="#22C55E" />
                    ))}
                  </>
                );
              })()}
            </Svg>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#FB923C" }]} /><Text style={styles.legendText}>Doanh thu</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} /><Text style={styles.legendText}>Xu hướng</Text></View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Booking List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          style={{ flex: 1 }}
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

  // Revenue Cards
  revenueCards: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 10, marginBottom: 4,
  },
  revCard: {
    flex: 1, borderRadius: 12, padding: 10, borderWidth: 1, gap: 2, alignItems: "center",
  },
  revValue: { fontSize: 18, fontWeight: "900" },
  revLabel: { fontSize: 10, fontWeight: "600" },

  // Financial Summary
  finCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 8, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  finRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12,
  },
  finLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  finDot: { width: 10, height: 10, borderRadius: 3 },
  finLabel: { fontSize: 15, fontWeight: "700", color: "#344054" },
  finValue: { fontSize: 17, fontWeight: "700", color: "#101828" },
  finDivider: { height: 1, backgroundColor: "#E4E7EC" },

  // Trend Chart
  chartCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 8, borderRadius: 14,
    padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  chartHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  chartTitle: { fontSize: 12, fontWeight: "800", color: "#101828", letterSpacing: 0.5 },
  chartSubtitle: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },

  // Loading
  loadingWrap: { marginTop: 30, alignItems: "center", gap: 8 },
  loadingText: { color: adminTheme.colors.muted, fontSize: 12 },

  // List
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },

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
  crownBadgeSmall: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },

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
