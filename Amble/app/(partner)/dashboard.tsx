import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { bookingAPI, partnerDashboardAPI } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";
import { timeAgo } from "../../utils/timeAgo";

const { width } = Dimensions.get("window");

interface DashboardOverview {
  totalTables: number;
  availableTables: number;
  bookedTables: number;
  reservedTables?: number;
  occupiedTables?: number;
  cleaningTables?: number;
  pendingOrders: number;
  todayBookings: number;
  totalBookings?: number;
}

interface PendingBookingItem {
  id: string;
  userName: string;
  userPhone: string;
  tableNumber: string;
  date: string;
  time: string;
  guests: number;
  depositAmount: number;
  status: string;
  createdAt?: string;
}

const DEFAULT_OVERVIEW: DashboardOverview = {
  totalTables: 0,
  availableTables: 0,
  bookedTables: 0,
  pendingOrders: 0,
  todayBookings: 0,
  totalBookings: 0,
};

const PACKAGE_CONFIG = {
  basic: { label: "Basic", color: "#6B7280", bg: "#F9FAFB" },
  standard: { label: "Standard", color: "#9333EA", bg: "#FAF5FF" },
};

// ──────────────────────────────────────────────────────────────────────────────────────────────
export default function PartnerDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { partner, restaurant } = usePartnerAuthStore();

  const [overview, setOverview] = useState<DashboardOverview>(DEFAULT_OVERVIEW);
  const [pendingBookings, setPendingBookings] = useState<PendingBookingItem[]>([]);
  const [floorTables, setFloorTables] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<{ totalRevenue: number; breakdown: Array<{ label: string; total: number; count: number }> } | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<"week" | "month">("month");

  const pkg = PACKAGE_CONFIG[partner?.subscriptionPackage || "basic"] || PACKAGE_CONFIG.basic;
  const occupancyRate =
    overview.totalTables > 0
      ? Math.round((overview.bookedTables / overview.totalTables) * 100)
      : 0;
  const hasRevenue = revenueData !== null && revenueData.totalRevenue > 0;
  const maxRevenueInWeek = Math.max(...(revenueData?.breakdown?.map(d => d.total) || [0]), 1);
  const revenueBars = (revenueData?.breakdown || []).map((d, i) => ({
    label: d.label,
    value: d.total,
    heightPercent: Math.max(8, Math.round((d.total / maxRevenueInWeek) * 100)),
    highlight: i === (revenueData?.breakdown?.length || 1) - 1,
  }));

  // ── Animations ────────────────────────────────────────────────────────────────────────────
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;
  const ordersAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = async () => {
    try {
      const [overviewRes, revenueRes] = await Promise.all([
        partnerDashboardAPI.getOverview(),
        partnerDashboardAPI.getRevenue(revenuePeriod),
      ]);
      setOverview(overviewRes.data?.overview || DEFAULT_OVERVIEW);
      setPendingBookings(overviewRes.data?.pendingBookings || []);
      setFloorTables(overviewRes.data?.floorTables || []);
      setUpcomingBookings(overviewRes.data?.upcomingBookings || []);
      setRevenueData(revenueRes.data?.data || null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể tải dashboard partner";
      Alert.alert(t("common.error"), message);
    } finally {
      setIsLoading(false);
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    Animated.stagger(80, [
      Animated.spring(headerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(chartAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }),
      Animated.spring(ordersAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }),
      Animated.spring(actionsAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }),
    ]).start();

    loadDashboard();
  }, [revenuePeriod]);

  const slideUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  });

  // ── Actions ───────────────────────────────────────────────────────────────────────────────
  const handleConfirm = async (id: string) => {
    try {
      setIsActionLoading(true);
      await bookingAPI.confirm(id);
      await loadDashboard();
    } catch (error: any) {
      setIsActionLoading(false);
      const message =
        error?.response?.data?.message || "Không thể xác nhận booking";
      Alert.alert(t("common.error"), message);
    }
  };

  const handleReject = (id: string) => {
    Alert.alert(t("partner.orders.rejectTitle"), t("partner.orders.rejectConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("partner.dashboard.reject"),
        style: "destructive",
        onPress: async () => {
          try {
            setIsActionLoading(true);
            await partnerDashboardAPI.declineBooking(id);
            await loadDashboard();
          } catch (error: any) {
            setIsActionLoading(false);
            const message =
              error?.response?.data?.message || "Không thể từ chối booking";
            Alert.alert(t("common.error"), message);
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────────────────────

  const getTableStatusColor = (status: string, table?: any) => {
    // VIP tables get purple tint
    const isVip = table?.type === "vip";
    switch (status) {
      case "available":
        return { color: "#22C55E", bg: "#F0FDF4", border: "#86EFAC" };
      case "reserved":
        return { color: isVip ? "#9333EA" : "#EAB308", bg: isVip ? "#FAF5FF" : "#FEFCE8", border: isVip ? "#C4B5FD" : "#FDE68A" };
      case "occupied":
        return { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" };
      case "cleaning":
        return { color: "#9CA3AF", bg: "#F3F4F6", border: "#D1D5DB" };
      default:
        return { color: "#22C55E", bg: "#F0FDF4", border: "#86EFAC" };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 8) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        )}

        {/* ── Header ───────────────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, slideUp(headerAnim)]}>
          <View>
            <Text style={styles.headerSub}>{t("partner.dashboard.welcome")}</Text>
            <Text style={styles.headerName}>
              {partner?.ownerName || "Partner"}
            </Text>
          </View>
        </Animated.View>

        {/* ── Restaurant name + package badge ──────────────────────────────────────────── */}
        <Animated.View style={[styles.restaurantRow, slideUp(headerAnim)]}>
          <View style={styles.restaurantNameRow}>
            <Ionicons name="restaurant-outline" size={14} color="#374151" />
            <Text style={styles.restaurantName} numberOfLines={1}>
              {partner?.restaurantName || restaurant?.name || t("partner.dashboard.restaurantFallback")}
            </Text>
          </View>
          <View style={[styles.pkgBadge, { backgroundColor: pkg.bg }]}>
            <Text style={[styles.pkgBadgeText, { color: pkg.color }]}>
              {pkg.label}
            </Text>
          </View>
        </Animated.View>

        {/* ── Stats grid ──────────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.statsGrid, slideUp(statsAnim)]}>
          <StatCard
            iconName="grid-outline"
            label={t("partner.dashboard.statsAvailable")}
            value={overview.availableTables}
            total={overview.totalTables}
            color="#FF8F1F"
            bg="#FFF3E0"
          />
          <StatCard
            iconName="ellipse-outline"
            label={t("partner.dashboard.statsBooked")}
            value={overview.bookedTables}
            total={overview.totalTables}
            color="#FF8F1F"
            bg="#FFF3E0"
          />
          <StatCard
            iconName="calendar-outline"
            label={t("partner.dashboard.statsToday")}
            value={overview.todayBookings}
            color="#FF8F1F"
            bg="#FFF3E0"
          />
          <StatCard
            iconName="time-outline"
            label={t("partner.dashboard.statsPending")}
            value={overview.pendingOrders}
            color="#FF8F1F"
            bg="#FFF3E0"
            alert={overview.pendingOrders > 0}
          />
        </Animated.View>

        {/* ── Floor Plan - Sơ đồ bàn ── *Ẩn theo yêu cầu*
        {floorTables.length > 0 && (
          ...
        )} */}

        {/* ── Upcoming bookings ─────────────────────────────── */}
        {upcomingBookings.length > 0 && (
          <Animated.View style={[slideUp(ordersAnim), { marginBottom: 16 }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={14} color="#1A1A1A" />
                <Text style={styles.sectionTitle}>Booking sắp tới</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(partner)/orders")}>
                <View style={styles.sectionLinkBtn}>
                  <Text style={styles.sectionLink}>{t("common.viewAll")}</Text>
                </View>
              </TouchableOpacity>
            </View>
            {upcomingBookings.slice(0, 5).map((bk: any) => (
              <View key={bk.id} style={styles.upcomingCard}>
                <View style={styles.upcomingLeft}>
                  <View style={styles.upcomingTimeBox}>
                    <Text style={styles.upcomingTimeH}>{bk.time?.split(":")[0]}</Text>
                    <Text style={styles.upcomingTimeM}>:{bk.time?.split(":")[1]}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingName}>{bk.userName}</Text>
                  <Text style={styles.upcomingDetail}>
                    {bk.tableNumber} • {bk.guests} khách
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Revenue card ──────────────────────────────────────────────────── */}
        <Animated.View style={slideUp(chartAnim)}>
          <LinearGradient
            colors={["#1A1A1A", "#2D2D2D"]}
            style={styles.revenueCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.revenueHeader}>
              <View style={styles.revenueTitleRow}>
                <Ionicons name="bar-chart-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.revenueLabel}>{t("partner.dashboard.revenue")}</Text>
                {/* Period tabs */}
                <View style={styles.periodRowRev}>
                  {[{ key: "week", label: "Tuần" }, { key: "month", label: "Tháng" }].map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => setRevenuePeriod(p.key as any)}
                      style={[styles.periodBtnRev, revenuePeriod === p.key && styles.periodBtnRevActive]}
                    >
                      <Text style={[styles.periodTextRev, revenuePeriod === p.key && styles.periodTextRevActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.revenueAmount}>
                {revenueData ? revenueData.totalRevenue.toLocaleString("vi-VN") : "---"} <Text style={{ fontSize: 12, fontWeight: "600" }}>vnd</Text>
              </Text>
              {revenueData && revenueData.totalRevenue > 0 && (
                <View style={styles.revenueGrowthRow}>
                  <Text style={styles.revenueGrowthUp}>✓ {revenueData.breakdown?.length || 0} {revenuePeriod === "week" ? "ngày" : "tuần"}</Text>
                  <Text style={styles.revenueGrowthLabel}>trong kỳ</Text>
                </View>
              )}
            </View>

            {/* Chart bars */}
            {revenueBars.length > 0 ? (
              <View style={styles.chartRow}>
                {revenueBars.map((bar, i) => (
                  <View key={i} style={styles.chartBarWrap}>
                    <View style={styles.chartTrack}>
                      <View style={[styles.chartBar, { height: `${bar.heightPercent}%`, backgroundColor: bar.highlight ? "#FF6B35" : "#4B5563" }]} />
                    </View>
                    <Text style={styles.chartLabel}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.chartEmpty}>Chưa có dữ liệu doanh thu</Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Pending orders ──────────────────────────────────────────────────────────── */}
        {pendingBookings.length > 0 && (
          <Animated.View style={slideUp(ordersAnim)}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flash-outline" size={14} color="#1A1A1A" />
                <Text style={styles.sectionTitle}>{t("partner.dashboard.pendingSection")}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(partner)/orders")}>
                <View style={styles.sectionLinkBtn}>
                  <Text style={styles.sectionLink}>{t("common.viewAll")}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {pendingBookings.slice(0, 2).map((booking) => (
              <View key={booking.id} style={styles.pendingCard}>
                <View style={styles.pendingCardTop}>
                  <View>
                    <Text style={styles.pendingName}>{booking.userName}</Text>
                    <Text style={styles.pendingPhone}>{booking.userPhone}</Text>
                  </View>
                  <View style={styles.pendingRight}>
                    <Text style={styles.pendingTable}>
                      {booking.tableNumber}
                    </Text>
                    <Text style={styles.pendingTime}>
                      {booking.date} • {booking.time}
                    </Text>
                    {booking.createdAt && (
                      <Text style={styles.pendingTimeAgo}>{timeAgo(booking.createdAt)}</Text>
                    )}
                    <Text style={styles.pendingGuests}>
                      {booking.guests} {t("partner.dashboard.guests")}
                    </Text>
                  </View>
                </View>

                <View style={styles.pendingDeposit}>
                  <View style={styles.pendingDepositRow}>
                    <Ionicons name="wallet-outline" size={12} color="#92400E" />
                    <Text style={styles.pendingDepositText}>
                      {t("partner.dashboard.deposit", { amount: booking.depositAmount.toLocaleString("vi-VN") })}
                    </Text>
                  </View>
                </View>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    disabled={isActionLoading}
                    onPress={() => handleReject(booking.id)}
                  >
                    <Text style={styles.rejectBtnText}>{t("partner.dashboard.reject")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    disabled={isActionLoading}
                    onPress={() => handleConfirm(booking.id)}
                  >
                    <LinearGradient
                      colors={["#22C55E", "#16A34A"]}
                      style={styles.confirmBtnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.confirmBtnText}>{t("partner.dashboard.confirm")}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

      </ScrollView>

      {/* ── Bottom nav ────────────────────────────────────────────────────────────────── */}
      <PartnerBottomNav pendingCount={pendingBookings.length} />
    </SafeAreaView>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────────────────────
function StatCard({
  iconName,
  label,
  value,
  total,
  color,
  bg,
  alert,
}: {
  iconName: string;
  label: string;
  value: number;
  total?: number;
  color: string;
  bg: string;
  alert?: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (alert) { /* pulse animation */ } }, [alert]);

  return (
    <View style={styles.statCard}>
      <View style={styles.statRow}>
        <Ionicons name={iconName as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: "#000" }]}>
        {value}
        {total !== undefined && <Text style={styles.statTotal}>/{total}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerSub: { fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#202020" },
  headerName: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#202020" },

  // Restaurant row
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  restaurantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    flex: 1,
  },
  pkgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pkgBadgeText: { fontSize: 11, fontWeight: "800" },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    flex: 1,
    minWidth: "45%",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  statLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  statValue: { fontSize: 26, fontWeight: "600" },
  statTotal: { fontSize: 14, color: "#9CA3AF" },

  // Revenue chart
  revenueCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  revenueHeader: { marginBottom: 16 },
  revenueTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  periodRowRev: {
    flexDirection: "row", gap: 4, marginLeft: 8,
  },
  periodBtnRev: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  periodBtnRevActive: {
    backgroundColor: "#FF6B35",
  },
  periodTextRev: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  periodTextRevActive: { color: "#fff" },
  chartEmpty: { fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingVertical: 20 },
  revenueAmount: { fontSize: 31, fontWeight: "900", color: "#fff" },
  revenueGrowthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  revenueGrowthUp: { fontSize: 12, color: "#22C55E", fontWeight: "700" },
  revenueGrowthLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)" },

  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
    height: 124,
  },
  chartBarWrap: {
    flex: 1,
    alignItems: "center",
  },
  chartTrack: {
    width: 30,
    height: 100,
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  chartLabel: {
    fontSize: 11,
    marginTop: 8,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  sectionLink: { fontSize: 12, color: "#FF6B35", fontWeight: "700" },
  sectionLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
  },

  // Pending cards
  pendingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pendingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pendingName: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  pendingPhone: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  pendingRight: { alignItems: "flex-end" },
  pendingTable: { fontSize: 13, fontWeight: "700", color: "#FF6B35" },
  pendingTime: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  pendingTimeAgo: { fontSize: 10, color: "#FF6B35", fontWeight: "700", marginTop: 2 },
  pendingGuests: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  pendingDeposit: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: 8,
    padding: 6,
    marginBottom: 10,
  },
  pendingDepositRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pendingDepositText: { fontSize: 12, color: "#92400E", fontWeight: "600" },
  pendingActions: { flexDirection: "row", gap: 8 },
  rejectBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: { fontSize: 13, color: "#DC2626", fontWeight: "800" },
  confirmBtn: { flex: 1, height: 42, borderRadius: 12, overflow: "hidden" },
  confirmBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { fontSize: 13, color: "#fff", fontWeight: "800" },

  // Floor plan
  legendRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10, paddingHorizontal: 2,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 10, color: "#6B7280", fontWeight: "600" },
  floorGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  floorCell: {
    width: "18%", aspectRatio: 1, borderRadius: 10, borderWidth: 2,
    alignItems: "center", justifyContent: "center", padding: 2,
  },
  floorCellName: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  floorCellGuest: { fontSize: 7, marginTop: 1 },

  // Upcoming bookings
  upcomingCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#F3F4F6", padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  upcomingLeft: { alignItems: "center", marginRight: 14, width: 44 },
  upcomingTimeBox: { alignItems: "center" },
  upcomingTimeH: { fontSize: 16, fontWeight: "900", color: "#FF6B35", lineHeight: 18 },
  upcomingTimeM: { fontSize: 11, color: "#9CA3AF", fontWeight: "700" },
  upcomingName: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  upcomingDetail: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
