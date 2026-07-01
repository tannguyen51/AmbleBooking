import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { adminAPI, adminAnalyticsAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import AdminAIChat from "../../components/admin/AdminAIChat";
import { useTranslation } from "../../i18n/useTranslation";

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
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [peakHour, setPeakHour] = useState("--");

  const loadStats = async () => {
    setLoading(true);
    try {
      const dashRes = await adminAPI.getDashboard();
      setStats(dashRes.data?.stats || EMPTY_STATS);
    } catch { setStats(EMPTY_STATS); }
    finally { setLoading(false); }
  };

  const loadExtras = async () => {
    try {
      const res = await adminAnalyticsAPI.getOverview(undefined);
      const d = res.data?.data || {};
      if (d.totalRevenue) setRevenue(d.totalRevenue);
      if (d.peakHour) setPeakHour(d.peakHour);
    } catch {}
  };

  useEffect(() => { loadStats(); loadExtras(); }, []);

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#FF8F1F" />
      </View>
    );
  }

  const chartBookingValue = stats.bookingsToday || 0;
  const activeUsersValue = stats.activeUsers || 0;
  const partnersActiveValue = stats.partnersActive || 0;
  const restaurantsTotal = stats.restaurantsActive || 0;
  const pendingValue = stats.partnersPending || 0;
  const revenueDisplay = revenue > 0 ? `${revenue.toLocaleString("vi-VN")}đ` : "--";

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
            <Text style={s.statNumberBlue}>{restaurantsTotal}</Text>
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

        {/* Quick Start */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Quick Start</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity style={s.qsCard} onPress={() => router.push("/admin/bookings" as any)} activeOpacity={0.7}>
              <View style={s.qsIcon}><Ionicons name="receipt-outline" size={22} color="#FF8F1F" /></View>
              <Text style={s.qsLabel}>Xem đơn hàng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.qsCard} onPress={() => router.push("/admin/partners" as any)} activeOpacity={0.7}>
              <View style={s.qsIcon}><Ionicons name="business-outline" size={22} color="#FF8F1F" /></View>
              <Text style={s.qsLabel}>Duyệt đối tác</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.qsCard} onPress={() => router.push("/admin/analytics" as any)} activeOpacity={0.7}>
              <View style={s.qsIcon}><Ionicons name="stats-chart-outline" size={22} color="#FF8F1F" /></View>
              <Text style={s.qsLabel}>Phân tích</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.qsCard} onPress={() => router.push("/admin/restaurants" as any)} activeOpacity={0.7}>
              <View style={s.qsIcon}><Ionicons name="restaurant-outline" size={22} color="#FF8F1F" /></View>
              <Text style={s.qsLabel}>Nhà hàng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Metric Cards — 2x2 grid */}
        <View style={s.metricGrid}>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/users" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{activeUsersValue}</Text>
            <Text style={s.metricLabel}>User đang hoạt động</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/bookings" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{chartBookingValue}</Text>
            <Text style={s.metricLabel}>Đơn hôm nay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/analytics" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{revenueDisplay}</Text>
            <Text style={s.metricLabel}>Doanh thu tháng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.metricCard} onPress={() => router.push("/admin/analytics" as any)} activeOpacity={0.7}>
            <Text style={s.metricBig}>{peakHour}</Text>
            <Text style={s.metricLabel}>Giờ cao điểm</Text>
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
  statNumberBlue: { fontSize: 24, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#3B82F6", marginTop: 4 },
  statLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A", marginTop: 2 },
  statSubGreen: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#22C55E", marginTop: 4 },
  statSubOrange: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#FF8F1F", marginTop: 4 },
  statSubBlue: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "400", color: "#3B82F6", marginTop: 4 },

  // Card
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, marginHorizontal: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },

  // Quick Start
  qsCard: { width: "47%", backgroundColor: "#FFF8F2", borderRadius: 12, padding: 14, alignItems: "center", gap: 8 },
  qsIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  qsLabel: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1A1A1A" },

  // Metrics
  metricGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  metricCard: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  metricBig: { fontSize: 22, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" },
  metricLabel: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1A1A1A", marginTop: 2 },

  // Support bar
  supportBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 28, marginHorizontal: 12, paddingHorizontal: 16, paddingRight: 4, height: 48, borderWidth: 1.5, borderColor: "#FF8F1F", marginBottom: 16 },
  supportPlaceholder: { flex: 1, fontSize: 16, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#A0A0A0" },
  supportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FF8F1F", alignItems: "center", justifyContent: "center" },
});
