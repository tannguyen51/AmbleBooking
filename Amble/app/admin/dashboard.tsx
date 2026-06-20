import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Line, Circle, Polygon, Polyline, Text as SvgText } from "react-native-svg";
import { adminAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import AdminAIChat from "../../components/admin/AdminAIChat";
import { useTranslation } from "../../i18n/useTranslation";

const { width: SW } = Dimensions.get("window");

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  partnersPending: number;
  partnersActive: number;
  restaurantsActive: number;
  bookingsToday: number;
};

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0, activeUsers: 0, partnersPending: 0,
  partnersActive: 0, restaurantsActive: 0, bookingsToday: 0,
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState(7);
  const [chartData, setChartData] = useState<number[]>([]);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const AREA_COLORS = []; // unused — donut chart removed

  const loadStats = async () => {
    setLoading(true);
    try {
      const [dashRes, bookingsRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getBookings({ limit: 200 }),
      ]);
      setStats(dashRes.data?.stats || EMPTY_STATS);

      // Build chart data from real bookings grouped by date
      const bookings = bookingsRes.data?.bookings || [];
      const lastNDays: Record<string, number> = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        lastNDays[key] = 0;
      }
      bookings.forEach((b: any) => {
        const d = new Date(b.createdAt || b.date);
        const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in lastNDays) lastNDays[key] = (lastNDays[key] || 0) + 1;
      });
      const entries = Object.entries(lastNDays);
      const data = entries.map(e => e[1]);
      setChartData(data);
    } catch { setStats(EMPTY_STATS); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#FF8F1F" />
      </View>
    );
  }

  // Chart data — from real stats, no hardcoding
  const chartBookingValue = stats.bookingsToday || 0;
  const activeUsersValue = stats.activeUsers || 0;
  const partnersActiveValue = stats.partnersActive || 0;
  const restaurantsTotal = stats.restaurantsActive || 0;
  const pendingValue = stats.partnersPending || 0;
  const totalBookingsMonth = chartData.reduce((a, b) => a + b, 0);

  // Chart data from real DB — scale to fit chart area (180px)
  const rawData = chartData.length > 0 ? chartData.slice(-chartRange) : [];
  const maxVal = Math.max(...rawData, 1);
  // Round up maxVal to nearest nice number for Y-axis, minimum 50
  const yMax = Math.max(50, Math.ceil(maxVal / 10) * 10);
  const chartBarData = rawData.length > 0
    ? rawData.map(v => Math.round((v / yMax) * 150) + 5)
    : [0];
  const chartDays = Array.from({ length: Math.min(chartRange, chartData.length) }, (_, i) => {
    return String(i + 1);
  });

  // Area breakdown — from stats (placeholder until API provides this)
  // areaData loaded from real restaurant DB data

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header — orange gradient */}
        <LinearGradient colors={["#FF8B25", "#FFD109"]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={s.headerTitle}>Admin Quản trị</Text>
            <TouchableOpacity onPress={async () => { await logout(); router.replace("/welcome"); }} style={{ padding: 8 }}>
              <Ionicons name="log-out-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Row — 4 clickable cards */}
        <View style={s.statsRow}>
          <TouchableOpacity style={[s.statCard, s.statCardOrange]} onPress={() => router.push("/admin/bookings" as any)} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={20} color="#FF8F1F" />
            <Text style={s.statNumber}>{chartBookingValue}</Text>
            <Text style={s.statLabel}>Đơn mới</Text>
            <Text style={s.statSubGreen}>Hôm nay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.statCard, s.statCardOrange]} onPress={() => router.push("/admin/partners" as any)} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={20} color="#FF8F1F" />
            <Text style={s.statNumber}>{pendingValue}</Text>
            <Text style={s.statLabel}>Chờ duyệt</Text>
            <Text style={s.statSubOrange}>Cần xử lý</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.statCard, s.statCardBlue]} onPress={() => router.push("/admin/restaurants" as any)} activeOpacity={0.7}>
            <Ionicons name="restaurant-outline" size={20} color="#3B82F6" />
            <Text style={s.statNumber}>{restaurantsTotal}</Text>
            <Text style={s.statLabel}>Nhà hàng</Text>
            <Text style={s.statSubBlue}>Đang hoạt động</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.statCard, s.statCardGreen]} onPress={() => router.push("/admin/partners" as any)} activeOpacity={0.7}>
            <Ionicons name="storefront-outline" size={20} color="#22C55E" />
            <Text style={s.statNumberGreen}>{partnersActiveValue}</Text>
            <Text style={s.statLabel}>Đối tác hoạt động</Text>
            <Text style={s.statSubGreen}>Đang hoạt động</Text>
          </TouchableOpacity>
        </View>

        {/* Tổng quan nhanh — Line chart */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Đơn đăng ký theo ngày</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Text style={s.chartBig}>{chartBookingValue}</Text>
            <Text style={s.chartUp}>đơn hôm nay</Text>
          </View>
          <TouchableOpacity style={s.dropdown} onPress={() => setChartRange(chartRange === 7 ? 30 : 7)} activeOpacity={0.7}>
            <Text style={s.dropdownText}>{chartRange} ngày</Text>
            <Ionicons name="chevron-down" size={12} color="#898887" />
          </TouchableOpacity>
          {/* SVG Line Chart — dynamic point count */}
          <View style={{ height: 220, marginTop: 12 }}>
            <Svg width="100%" height="100%" viewBox="0 0 300 220">
              {/* Grid lines */}
              {[0, 45, 90, 135, 180].map(y => (
                <Line key={y} x1={30} y1={y} x2={300} y2={y} stroke="#F0F0F0" strokeWidth={1} />
              ))}
              {/* Y-axis labels — dynamic based on data */}
              {[yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0].map((v, i) => (
                <SvgText key={i} x={5} y={i * 45 + 15} fontSize={9} fill="#CCC" fontFamily="Montserrat_500Medium">{v}</SvgText>
              ))}
              {/* Filled area */}
              <Polygon
                points={`30,180 ${chartBarData.map((v, i) => `${Math.round(40 + i * (260 / (chartBarData.length - 1 || 1)))},${180 - v}`).join(" ")} 290,180`}
                fill="rgba(255,143,31,0.1)"
              />
              {/* Line connecting all points */}
              <Polyline
                points={chartBarData.map((v, i) => `${Math.round(40 + i * (260 / (chartBarData.length - 1 || 1)))},${180 - v}`).join(" ")}
                stroke="#FF8F1F" strokeWidth={2.5} fill="none" strokeLinejoin="round"
              />
              {/* Data points + labels — show all for ≤14 days, every 2nd for >14 */}
              {chartBarData.map((v, i) => {
                const step = chartBarData.length > 20 ? 2 : 1;
                const show = i % step === 0 || i === chartBarData.length - 1;
                const x = Math.round(40 + i * (260 / (chartBarData.length - 1 || 1)));
                return (
                  <React.Fragment key={i}>
                    {show && <SvgText x={x - 14} y={195} fontSize={8} fill="#898887" fontFamily="Montserrat_500Medium" textAnchor="middle">{chartDays[i]}</SvgText>}
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Metric Cards */}
        <View style={s.metricRow}>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/users" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{activeUsersValue}</Text>
            <Text style={s.metricLabel}>User đang hoạt động</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/analytics" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{totalBookingsMonth}</Text>
            <Text style={s.metricLabel}>Tổng đơn tháng</Text>
          </TouchableOpacity>
        </View>

        {/* Support Bar */}
        <TouchableOpacity style={s.supportBar} onPress={() => setAiChatVisible(true)} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={18} color="#A0A0A0" style={{ marginRight: 8 }} />
          <Text style={s.supportPlaceholder}>Bạn cần hỗ trợ gì?</Text>
          <View style={s.supportBtn}>
            <Image source={require("../../assets/images/chatbot-speech-bubble.png")} style={{ width: 22, height: 22, tintColor: "#fff" }} resizeMode="contain" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <AdminAIChat showFab={false} visible={aiChatVisible} onToggle={setAiChatVisible} />
      <AdminBottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F2" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8F2" },
  content: { paddingBottom: 20 },

  // Header
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FFFFFF" },

  // Stats
  statsRow: { flexDirection: "row", paddingHorizontal: 8, gap: 4, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 8, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statCardOrange: { borderLeftWidth: 3, borderLeftColor: "#FF8F1F" },
  statCardBlue: { borderLeftWidth: 3, borderLeftColor: "#3B82F6" },
  statCardGreen: { borderLeftWidth: 3, borderLeftColor: "#22C55E" },
  statNumber: { fontSize: 24, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F", marginTop: 4 },
  statNumberGreen: { fontSize: 24, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#22C55E", marginTop: 4 },
  statLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A", marginTop: 2 },
  statSubGreen: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#22C55E", marginTop: 4 },
  statSubOrange: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#FF8F1F", marginTop: 4 },
  statSubBlue: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#3B82F6", marginTop: 4 },

  // Overview card
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, marginHorizontal: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  overviewRow: { flexDirection: "row", gap: 12 },
  chartCol: { flex: 1 },
  chartTitle: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1A1A1A", marginBottom: 4 },
  chartBig: { fontSize: 32, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" },
  chartUp: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#22C55E" },
  dropdown: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F5F5F5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 8 },
  dropdownText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#898887" },
  chartArea: { alignItems: "center", paddingVertical: 8 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  chartBar: { width: 14, borderRadius: 3 },

  lineChartWrap: { flexDirection: "row", marginTop: 12 },

  // Donut area (removed, keeping styles for reference)
  donutWrap: { alignItems: "center", marginTop: 8 },
  donutCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFF8F2", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  donutBig: { fontSize: 22, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" },
  donutSub: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1A1A1A" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#6B7280" },

  // Metrics
  metricRow: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  metricBig: { fontSize: 32, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" },
  metricLabel: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1A1A1A", marginTop: 2 },

  // Support bar
  supportBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 28, marginHorizontal: 12, paddingHorizontal: 16, paddingRight: 4, height: 48, borderWidth: 1.5, borderColor: "#FF8F1F", marginBottom: 16 },
  supportPlaceholder: { flex: 1, fontSize: 16, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#A0A0A0" },
  supportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FF8F1F", alignItems: "center", justifyContent: "center" },
});
