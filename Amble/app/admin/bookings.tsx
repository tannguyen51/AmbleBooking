import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Image, ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { useTranslation } from "../../i18n/useTranslation";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";

interface Restaurant {
  _id: string; name: string; city?: string; cuisine?: string;
  isActive?: boolean; images?: string[]; subscriptionPackage?: string;
}

interface BookingItem {
  _id: string; bookingNumber: string; status: string;
  bookingDetails?: { date?: string; time?: string; partySize?: number };
  userId?: { fullName?: string; email?: string; phone?: string };
  restaurantId?: { name?: string };
  tableId?: { name?: string };
  refund?: {
    refundPercent?: number; refundAmount?: number;
    bankName?: string; accountNumber?: string; accountName?: string;
    requestedAt?: string;
  };
  payment?: { status?: string };
}

const formatVnd = (amount?: number) => `${Number(amount || 0).toLocaleString("vi-VN")}đ`;

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", occupied: "Đang dùng",
  completed: "Hoàn tất", cancelled: "Đã hủy", declined: "Đã từ chối", no_show: "Vắng mặt",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFFAEB", text: "#B54708" }, confirmed: { bg: "#F0FDF4", text: "#067647" },
  occupied: { bg: "#FEF2F2", text: "#D92D20" }, completed: { bg: "#F2F4F7", text: "#475467" },
  cancelled: { bg: "#FEE4E2", text: "#D92D20" }, declined: { bg: "#F2F4F7", text: "#475467" },
  no_show: { bg: "#F2F4F7", text: "#475467" },
};

export default function AdminBookingsScreen() {
  const { t } = useTranslation();
  const [view, setView] = useState<"restaurants" | "bookings">("restaurants");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restSearch, setRestSearch] = useState("");
  const [restLoading, setRestLoading] = useState(true);
  const [selectedRestId, setSelectedRestId] = useState("");
  const [selectedRestName, setSelectedRestName] = useState("");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [revenue, setRevenue] = useState<{
    totalRevenue: number; totalBookings: number; completedBookings: number;
    avgPartySize: number; period: string;
    breakdown: Array<{ label: string; total: number; count: number }>;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setRestLoading(true);
      try {
        const res = await adminAPI.getRestaurants({ limit: 100, isActive: true });
        setRestaurants(res.data?.restaurants || []);
      } catch { setRestaurants([]); }
      finally { setRestLoading(false); }
    };
    load();
  }, []);

  const fetchRef = useRef(0);
  useEffect(() => {
    if (!selectedRestId) return;
    const id = ++fetchRef.current;
    setLoading(true);
    adminAPI.getBookings({ restaurantId: selectedRestId, search: searchText || undefined, limit: 100 } as any)
      .then((bookRes) => {
        if (id !== fetchRef.current) return;
        const all = bookRes.data?.bookings || [];
        setBookings(all.filter((b: BookingItem) => !["cancelled", "declined", "no_show"].includes(b.status)));
      })
      .catch(() => { if (id === fetchRef.current) setBookings([]); })
      .finally(() => { if (id === fetchRef.current) setLoading(false); });
    adminAPI.getRestaurantRevenue(selectedRestId, { period })
      .then((revRes) => {
        if (id !== fetchRef.current) return;
        const d = revRes.data?.data;
        if (d && typeof d.totalRevenue === "number") setRevenue(d);
      }).catch(() => {});
  }, [selectedRestId, searchText, period]);

  const selectRestaurant = (id: string, name: string) => {
    setSelectedRestId(id); setSelectedRestName(name); setSearchText(""); setView("bookings");
  };

  const goBack = () => {
    setSelectedRestId(""); setSelectedRestName(""); setSearchText("");
    setBookings([]); setView("restaurants");
  };

  const copyRefundInfo = async (item: BookingItem) => {
    const r = item.refund;
    if (!r?.accountNumber) { Alert.alert(t("common.notification"), "Thiếu thông tin ngân hàng"); return; }
    const text = [`Mã: ${item.bookingNumber}`, `Ngân hàng: ${r.bankName || "—"}`, `STK: ${r.accountNumber}`, `Chủ TK: ${r.accountName || "—"}`, `Số tiền: ${formatVnd(r.refundAmount)}`].join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert(t("common.notification"), "Đã copy");
  };

  const filteredRestaurants = restaurants.filter((r) => r.name.toLowerCase().includes(restSearch.toLowerCase()));

  // ── View: Restaurant List ──
  if (view === "restaurants") {
    return (
      <View style={s.root}>
        <LinearGradient colors={["#FF8B25", "#FFD109"]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={s.headerTitle}>Doanh thu</Text>
        </LinearGradient>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput style={s.searchInput} placeholder="Tìm nhà hàng..." placeholderTextColor="#9CA3AF" value={restSearch} onChangeText={setRestSearch} />
        </View>
        {restLoading ? (
          <View style={s.center}><ActivityIndicator size="small" color="#FF8F1F" /><Text style={s.loadingText}>{t("common.loading")}</Text></View>
        ) : (
          <FlatList
            data={filteredRestaurants}
            keyExtractor={(item) => item._id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.restCard} onPress={() => selectRestaurant(item._id, item.name)} activeOpacity={0.7}>
                <View style={s.restImgWrap}>
                  {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={s.restImg} /> : <Ionicons name="restaurant-outline" size={22} color="#FF8F1F" />}
                  {item.isActive && item.subscriptionPackage === "standard" && (
                    <View style={s.crownBadge}><Ionicons name="diamond" size={10} color="#fff" /></View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.restName}>{item.name}</Text>
                  <Text style={s.restSub}>{[item.city, item.cuisine].filter(Boolean).join(" • ") || "—"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="search-outline" size={40} color="#D0D5DD" />
                <Text style={s.emptyTitle}>Không tìm thấy nhà hàng</Text>
              </View>
            }
          />
        )}
        <AdminBottomNav />
      </View>
    );
  }

  // ── View: Booking Detail ──
  return (
    <View style={s.root}>
      <LinearGradient colors={["#FF8B25", "#FFD109"]} style={s.headerSmall} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>{selectedRestName}</Text>
            <Text style={s.headerSub}>Danh sách đơn đặt bàn</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput style={s.searchInput} placeholder="Tìm theo mã đơn, tên khách..." placeholderTextColor="#9CA3AF" value={searchText} onChangeText={setSearchText} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {revenue && (
          <>
            <View style={s.periodRow}>
              {[
                { key: "week", label: "Tuần" },
                { key: "month", label: "Tháng" },
                { key: "quarter", label: "3 Tháng" },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[s.periodBtn, period === p.key && s.periodBtnActive]}
                  onPress={() => setPeriod(p.key as any)}
                >
                  <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.kpiGrid}>
              <View style={[s.kpiCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[s.kpiValue, { color: '#067647' }]}>{revenue.totalRevenue.toLocaleString("vi-VN")} vnd</Text>
                <Text style={[s.kpiLabel, { color: '#067647' }]}>Doanh thu</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[s.kpiValue, { color: '#1D4ED8' }]}>{revenue.totalBookings}</Text>
                <Text style={[s.kpiLabel, { color: '#1D4ED8' }]}>Tổng đơn</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: '#FFFAEB', borderColor: '#FDE68A' }]}>
                <Text style={[s.kpiValue, { color: '#B54708' }]}>{revenue.completedBookings}</Text>
                <Text style={[s.kpiLabel, { color: '#B54708' }]}>Đã HT</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
                <Text style={[s.kpiValue, { color: '#6D28D9' }]}>{revenue.avgPartySize}</Text>
                <Text style={[s.kpiLabel, { color: '#6D28D9' }]}>Khách TB</Text>
              </View>
            </View>

            {revenue.breakdown?.length > 0 && (
              <View style={s.chartCard}>
                <View style={s.chartHeaderRow}>
                  <Text style={s.chartTitle}>DOANH THU</Text>
                  <Text style={s.chartSubtitle}>(nghìn đồng)</Text>
                </View>
                <Svg width={Math.max(280, revenue.breakdown.length * 80)} height={180}>
                  {(() => {
                    const data = revenue.breakdown;
                    const max = Math.max(...data.map((d: any) => d.total), 1);
                    const pad = { top: 20, bottom: 24, left: 10, right: 10 };
                    const plotW = (Math.max(280, data.length * 80) - pad.left - pad.right);
                    const plotH = 180 - pad.top - pad.bottom;
                    const gap = plotW / data.length;
                    const bw = Math.min(24, gap * 0.5);
                    const getY = (v: number) => pad.top + ((max - v) / max) * plotH;
                    return (
                      <>
                        {[0, 0.5, 1].map((r: number) => (
                          <Line key={r} x1={pad.left} y1={pad.top + r * plotH} x2={pad.left + plotW} y2={pad.top + r * plotH} stroke="#E4E7EC" strokeWidth={0.5} />
                        ))}
                        {data.map((d: any, i: number) => {
                          const cx = pad.left + i * gap + gap / 2;
                          const bh = (d.total / max) * plotH;
                          return <Rect key={i} x={cx - bw / 2} y={getY(d.total)} width={bw} height={Math.max(bh, 1)} rx={3} fill="#FB923C" opacity={0.85} />;
                        })}
                        {data.map((d: any, i: number) => {
                          const cx = pad.left + i * gap + gap / 2;
                          return <SvgText key={i} x={cx} y={getY(d.total) - 6} fill="#101828" fontSize={9} fontWeight="700" textAnchor="middle">{(d.total / 1000).toFixed(0)}k</SvgText>;
                        })}
                        {data.map((d: any, i: number) => {
                          const cx = pad.left + i * gap + gap / 2;
                          return <SvgText key={i} x={cx} y={180 - 4} fill="#6B7280" fontSize={9} fontWeight="600" textAnchor="middle">{d.label}</SvgText>;
                        })}
                      </>
                    );
                  })()}
                </Svg>
              </View>
            )}
          </>
        )}

        {loading ? (
          <View style={s.center}><ActivityIndicator size="small" color="#FF8F1F" /></View>
        ) : (
          <View style={s.list}>
            {bookings.map((item) => {
              const statusInfo = STATUS_COLORS[item.status] || { bg: "#F3F4F6", text: "#6B7280" };
              const r = item.refund;
              return (
                <View key={item._id} style={s.bookingCard}>
                  <View style={s.bookingCardHeader}>
                    <View>
                      <Text style={s.bookingCode}>{item.bookingNumber}</Text>
                      <Text style={s.customerName}>{item.userId?.fullName || item.userId?.email || "—"}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[s.statusText, { color: statusInfo.text }]}>{STATUS_LABELS[item.status] || item.status}</Text>
                    </View>
                  </View>
                  <View style={s.metaGrid}>
                    <Text style={s.metaText}>Ngày: {item.bookingDetails?.date || "—"} • {item.bookingDetails?.time || "—"} • {item.bookingDetails?.partySize || 0} khách</Text>
                    <Text style={s.metaText}>Bàn: {item.tableId?.name || "—"}</Text>
                  </View>

                  {r ? (
                    <View style={s.refundBox}>
                      <Text style={s.refundTitle}>Thông tin hoàn tiền</Text>
                      <View style={s.refundRow}><Text style={s.refundLabel}>Tỉ lệ</Text><Text style={s.refundValue}>{r.refundPercent}% → {formatVnd(r.refundAmount)}</Text></View>
                      <View style={s.refundRow}><Text style={s.refundLabel}>Ngân hàng</Text><Text style={s.refundValue}>{r.bankName || "—"}</Text></View>
                      <View style={s.refundRow}><Text style={s.refundLabel}>STK</Text><Text style={s.refundValueMono}>{r.accountNumber || "—"}</Text></View>
                      <View style={s.refundRow}><Text style={s.refundLabel}>Chủ TK</Text><Text style={s.refundValue}>{r.accountName || "—"}</Text></View>
                      <TouchableOpacity style={s.copyBtn} onPress={() => copyRefundInfo(item)}>
                        <Ionicons name="copy-outline" size={14} color="#1A1A1A" />
                        <Text style={s.copyBtnText}>Sao chép</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <AdminBottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F2" },

  // Header — giống dashboard/partners
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerSmall: { paddingTop: 60, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2, fontFamily: "Montserrat_400Regular" },
  backBtn: { padding: 4 },

  // Search — bo góc tròn
  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 16, borderRadius: 15, height: 44, paddingHorizontal: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#202020", padding: 0, marginLeft: 8 },

  // Loading
  center: { marginTop: 40, alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12, color: "#9CA3AF" },

  // List
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },

  // Restaurant Card
  restCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#EEF0F3",
  },
  restImgWrap: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: "#FFF5EB", alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  restImg: { width: "100%", height: "100%" },
  restName: { fontSize: 15, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  restSub: { fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Montserrat_400Regular" },
  crownBadge: {
    position: "absolute", top: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center",
  },

  // KPI Grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  kpiCard: { width: "47%", borderRadius: 12, padding: 12, borderWidth: 1, gap: 4, alignItems: "center" },
  kpiValue: { fontSize: 20, fontWeight: "900" },
  kpiLabel: { fontSize: 11, fontWeight: "600" },

  // Period
  periodRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#fff" },
  periodBtnActive: { backgroundColor: "#1A1C29", borderColor: "#1A1C29" },
  periodText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  periodTextActive: { color: "#fff" },

  // Chart
  chartCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 8, borderRadius: 14,
    padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  chartHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  chartTitle: { fontSize: 12, fontWeight: "800", color: "#101828", letterSpacing: 0.5 },
  chartSubtitle: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },

  // Booking Card
  bookingCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#EEF0F3",
  },
  bookingCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  bookingCode: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  customerName: { fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Montserrat_400Regular" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700" },
  metaGrid: { gap: 3, marginBottom: 4 },
  metaText: { fontSize: 12, color: "#6B7280", fontFamily: "Montserrat_400Regular" },

  // Refund
  refundBox: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", gap: 4 },
  refundTitle: { fontSize: 12, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  refundRow: { flexDirection: "row", justifyContent: "space-between" },
  refundLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  refundValue: { fontSize: 12, color: "#1A1A1A", fontWeight: "600" },
  refundValueMono: { fontSize: 12, color: "#1A1A1A", fontWeight: "700", letterSpacing: 0.3 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
  },
  copyBtnText: { fontSize: 11, fontWeight: "600", color: "#1A1A1A" },
});
