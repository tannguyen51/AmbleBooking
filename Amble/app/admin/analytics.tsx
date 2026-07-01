import React, { useState, useCallback } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminAnalyticsAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import AdminAIChat from "../../components/admin/AdminAIChat";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

const BG = "#FFF8F2";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const PRIMARY = "#FF8F1F";

type PeriodKey = "7days" | "30days" | "90days";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7days", label: "7 ngày" },
  { key: "30days", label: "30 ngày" },
  { key: "90days", label: "90 ngày" },
];

type TabKey = "overview" | "users" | "booking" | "cancel" | "peak";
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Tổng quan", icon: "stats-chart" },
  { key: "users", label: "Người dùng", icon: "people" },
  { key: "booking", label: "Đặt bàn", icon: "calendar" },
  { key: "cancel", label: "Hủy", icon: "close-circle" },
  { key: "peak", label: "Cao điểm", icon: "time" },
];

const getDateRange = (p: PeriodKey) => {
  const end = new Date().toISOString().slice(0, 10);
  const ms = p === "7days" ? 7 : p === "30days" ? 30 : 90;
  const start = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
};

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<PeriodKey>("30days");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({});
  const [aiChatVisible, setAiChatVisible] = useState(false);

  const fetchTab = useCallback(async (tab: TabKey, p: PeriodKey) => {
    const { from, to } = getDateRange(p);
    const ms = p === "7days" ? 14 : p === "30days" ? 60 : 180;
    const prevFrom = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
    const prevTo = from;

    try {
      switch (tab) {
        case "overview": {
          const [res, prevRes] = await Promise.all([
            adminAnalyticsAPI.getOverview(undefined, from, to),
            adminAnalyticsAPI.getOverview(undefined, prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, overview: res.data.data, overviewPrev: prevRes.data.data }));
          break;
        }
        case "users": {
          const [res, prevRes] = await Promise.all([
            adminAnalyticsAPI.getUserActivity(undefined, from, to),
            adminAnalyticsAPI.getUserActivity(undefined, prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, users: res.data.data, usersPrev: prevRes.data.data }));
          break;
        }
        case "booking": {
          const res = await adminAnalyticsAPI.getBookingFunnel(undefined, from, to);
          setData((d: any) => ({ ...d, funnel: res.data.data }));
          break;
        }
        case "cancel": {
          const [res, prevRes] = await Promise.all([
            adminAnalyticsAPI.getCancellationMetrics(undefined, from, to),
            adminAnalyticsAPI.getCancellationMetrics(undefined, prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, cancel: res.data.data, cancelPrev: prevRes.data.data }));
          break;
        }
        case "peak": {
          const res = await adminAnalyticsAPI.getPeakHours(undefined, from, to);
          setData((d: any) => ({ ...d, peak: res.data.data }));
          break;
        }
      }
    } catch (err) {
      console.error("[analytics]", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTab(activeTab, period).finally(() => setLoading(false));
    }, [activeTab, period, fetchTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTab(activeTab, period);
    setRefreshing(false);
  };

  // ── Render: Overview ──
  const renderOverview = () => {
    const d = data.overview || {};
    const p = data.overviewPrev || {};
    const totalBookings = d.totalBookings ?? "--";
    const totalRevenue = d.totalRevenue ? `${Math.round(d.totalRevenue / 1000)}k` : "--";
    const totalUsers = d.totalUsers ?? "--";
    const cancelRate = d.cancelRate != null ? `${d.cancelRate}%` : "--";
    const completionRate = d.completionRate != null ? `${d.completionRate}%` : "--";
    const confirmedCount = d.confirmedBookings ?? "--";
    const cancelledCount = d.cancelledBookings ?? "--";
    const completedCount = d.completedBookings ?? "--";
    const peakHour = d.peakHour ?? "--";
    const popularTable = d.popularTableType ?? "--";
    const newUsers = d.newUsers ?? "--";

    const donutSegments = (() => {
      if (typeof d.completedBookings !== "number") return [];
      const total = (d.completedBookings || 0) + (d.confirmedBookings || 0) + (d.cancelledBookings || 0);
      if (total === 0) return [];
      const comp = Math.round((d.completedBookings / total) * 100);
      const conf = Math.round((d.confirmedBookings / total) * 100);
      const canc = 100 - comp - conf;
      return [
        { label: "Hoàn tất", pct: comp, color: "#FF8F1F" },
        { label: "Xác nhận", pct: conf, color: "#FFB866" },
        { label: "Hủy", pct: canc, color: "#D1D5DB" },
      ];
    })();

    return (
      <View style={s.tabContent}>
        {/* Top 4 KPI cards */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}>
              <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.kpiCardLabel}>Đặt bàn</Text>
            <Text style={s.kpiCardValue}>{totalBookings}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}>
              <Ionicons name="receipt-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.kpiCardLabel}>Doanh thu</Text>
            <Text style={s.kpiCardValue}>{totalRevenue}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}>
              <Ionicons name="people-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.kpiCardLabel}>Người dùng</Text>
            <Text style={s.kpiCardValue}>{totalUsers}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}>
              <Ionicons name="close-circle-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.kpiCardLabel}>Tỉ lệ hủy</Text>
            <Text style={s.kpiCardValue}>{cancelRate}</Text>
          </View>
        </View>

        {/* Trạng thái đặt bàn */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Trạng thái đặt bàn</Text>
          <View style={s.donutRow}>
            {/* Donut Chart */}
            <View style={s.donutWrap}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                <Circle cx={70} cy={70} r={50} fill="none" stroke="#F3F4F6" strokeWidth={24} />
                {donutSegments.length > 0 && (() => {
                  const circumference = 2 * Math.PI * 50;
                  let cumulative = 0;
                  const segs = donutSegments.map((seg) => {
                    const segLen = (seg.pct / 100) * circumference;
                    const dashOffset = circumference * 0.25 - cumulative;
                    cumulative += segLen;
                    return { ...seg, segLen, dashOffset };
                  });
                  return segs.map((seg, i) => (
                    <Circle
                      key={i}
                      cx={70} cy={70} r={50}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={24}
                      strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                    />
                  ));
                })()}
                <SvgText x={70} y={66} fill={TEXT} fontSize={28} fontWeight="500" textAnchor="middle" fontFamily="Montserrat_500Medium">{totalBookings !== "--" ? totalBookings : "--"}</SvgText>
                <SvgText x={70} y={82} fill={TEXT_SEC} fontSize={11} fontWeight="400" textAnchor="middle" fontFamily="Montserrat_400Regular">Tổng</SvgText>
              </Svg>
            </View>
            {/* Legend */}
            <View style={s.donutLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#FF8F1F" }]} />
                <Text style={s.legendLabel}>Hoàn tất</Text>
                <Text style={s.legendValue}>{completedCount}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#FFB866" }]} />
                <Text style={s.legendLabel}>Xác nhận</Text>
                <Text style={s.legendValue}>{confirmedCount}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#D1D5DB" }]} />
                <Text style={s.legendLabel}>Hủy</Text>
                <Text style={s.legendValue}>{cancelledCount}</Text>
              </View>
              <View style={s.legendDivider} />
              <View style={s.legendItem}>
                <Text style={[s.legendLabel, { fontWeight: "800" }]}>Tổng</Text>
                <Text style={[s.legendValue, { fontWeight: "800" }]}>{totalBookings !== "--" ? totalBookings : "--"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Điểm nổi bật */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Điểm nổi bật</Text>
          <View style={s.highlightItem}>
            <View style={[s.highlightIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="time-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.highlightLabel}>Giờ đông nhất</Text>
              <Text style={s.highlightValue}>{peakHour}</Text>
            </View>
          </View>
          <View style={s.highlightItem}>
            <View style={[s.highlightIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="eye-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.highlightLabel}>Loại bàn nổi bật</Text>
              <Text style={s.highlightValue}>{popularTable}</Text>
            </View>
          </View>
          <View style={s.highlightItem}>
            <View style={[s.highlightIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="people-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.highlightLabel}>Người dùng mới</Text>
              <Text style={s.highlightValue}>{newUsers}</Text>
            </View>
          </View>
        </View>

        {/* Support bar */}
        <TouchableOpacity style={s.supportBar} onPress={() => setAiChatVisible(true)} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={18} color="#A0A0A0" style={{ marginRight: 8 }} />
          <Text style={s.supportPlaceholder}>Bạn cần hỗ trợ gì?</Text>
          <View style={s.supportBtn}>
            <Image source={require("../../assets/images/chatbot-speech-bubble.png")} style={{ width: 22, height: 22, tintColor: "#fff" }} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: Users ──
  const renderUsers = () => {
    const d = data.users || {};
    const totalUsers = d.totalUsers ?? "--";
    const newUsers = d.newUsers ?? "--";
    const returningUsers = d.returningUsers ?? "--";
    const dailyActive = d.dailyActive?.[d.dailyActive.length - 1]?.count ?? "--";

    const totalForDonut = (d.newUsers || 0) + (d.returningUsers || 0);
    const newPct = totalForDonut > 0 ? Math.round(((d.newUsers || 0) / totalForDonut) * 100) : 0;
    const retPct = totalForDonut > 0 ? 100 - newPct : 0;

    const donutSegments = totalForDonut > 0 ? [
      { label: "Mới", pct: newPct, color: "#FF8F1F", count: d.newUsers },
      { label: "Quay lại", pct: retPct, color: "#FFD4A3", count: d.returningUsers },
    ] : [];

    return (
      <View style={s.tabContent}>
        {/* 2x2 KPI Grid */}
        <View style={s.kpiGrid}>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="people-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Tổng người dùng</Text>
              <Text style={s.kpiGridValue}>{totalUsers}</Text>
            </View>
          </View>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="person-add-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Người dùng mới</Text>
              <Text style={s.kpiGridValue}>{newUsers}</Text>
            </View>
          </View>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="refresh-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Quay lại</Text>
              <Text style={s.kpiGridValue}>{returningUsers}</Text>
            </View>
          </View>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="trending-up-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Hoạt động/ngày</Text>
              <Text style={s.kpiGridValue}>{dailyActive}</Text>
            </View>
          </View>
        </View>

        {/* Tỉ lệ người dùng */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Tỉ lệ người dùng</Text>
          <View style={s.donutRow}>
            <View style={s.donutWrap}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                <Circle cx={70} cy={70} r={50} fill="none" stroke="#F3F4F6" strokeWidth={24} />
                {donutSegments.length > 0 && (() => {
                  const circumference = 2 * Math.PI * 50;
                  let cumulative = 0;
                  const segs = donutSegments.map((seg) => {
                    const segLen = (seg.pct / 100) * circumference;
                    const dashOffset = circumference * 0.25 - cumulative;
                    cumulative += segLen;
                    return { ...seg, segLen, dashOffset };
                  });
                  return segs.map((seg, i) => (
                    <Circle
                      key={i}
                      cx={70} cy={70} r={50}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={24}
                      strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                    />
                  ));
                })()}
                <SvgText x={70} y={70} fill={TEXT} fontSize={26} fontWeight="500" textAnchor="middle" fontFamily="Montserrat_500Medium">{totalForDonut || "--"}</SvgText>
                <SvgText x={70} y={86} fill={TEXT_SEC} fontSize={11} fontWeight="400" textAnchor="middle" fontFamily="Montserrat_400Regular">Tổng</SvgText>
              </Svg>
            </View>
            <View style={s.donutLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#FF8F1F" }]} />
                <Text style={s.legendLabel}>Mới</Text>
                <Text style={s.legendValue}>{newUsers} ({newPct}%)</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#FFD4A3" }]} />
                <Text style={s.legendLabel}>Quay lại</Text>
                <Text style={s.legendValue}>{returningUsers} ({retPct}%)</Text>
              </View>
              <View style={s.legendDivider} />
              <View style={s.legendItem}>
                <Text style={[s.legendLabel, { fontWeight: "800" }]}>Tổng</Text>
                <Text style={[s.legendValue, { fontWeight: "800" }]}>{totalForDonut || "--"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nhận xét nhanh */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Nhận xét nhanh</Text>
          <View style={s.insightItem}>
            <View style={s.insightIcon}>
              <Ionicons name="star-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={s.insightText}>{newPct}% là người dùng mới</Text>
          </View>
          <View style={s.insightItem}>
            <View style={s.insightIcon}>
              <Ionicons name="refresh-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={s.insightText}>Tỉ lệ quay lại: {retPct}%</Text>
          </View>
        </View>

        {/* Support bar */}
        <TouchableOpacity style={s.supportBar} onPress={() => setAiChatVisible(true)} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={18} color="#A0A0A0" style={{ marginRight: 8 }} />
          <Text style={s.supportPlaceholder}>Bạn cần hỗ trợ gì?</Text>
          <View style={s.supportBtn}>
            <Image source={require("../../assets/images/chatbot-speech-bubble.png")} style={{ width: 22, height: 22, tintColor: "#fff" }} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: Booking ──
  const renderBooking = () => {
    const d = data.funnel?.funnel || {};
    const conv = data.funnel?.funnelConversion || {};
    const views = d.restaurantViews ?? "--";
    const completed = d.bookingCompletedReal ?? d.bookingCompleted ?? "--";
    const viewToStart = conv.viewToStart ?? "--";
    const startToConfirm = conv.startToConfirm ?? "--";
    const confirmToComplete = conv.confirmToComplete ?? "--";
    const totalConv = views !== "--" && completed !== "--" && views > 0
      ? Math.round((completed / views) * 100) : "--";

    return (
      <View style={s.tabContent}>
        {/* Top 2 summary cards */}
        <View style={s.kpiRow}>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="eye-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Lượt xem</Text>
              <Text style={s.kpiGridValue}>{views}</Text>
            </View>
          </View>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="checkmark-circle-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Hoàn tất</Text>
              <Text style={s.kpiGridValue}>{completed}</Text>
            </View>
          </View>
        </View>

        {/* Conversion rates */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}><Ionicons name="arrow-forward-outline" size={18} color={PRIMARY} /></View>
            <Text style={s.kpiCardLabelLight}>Xem → Bắt đầu</Text>
            <Text style={s.kpiCardValueLight}>{typeof viewToStart === "number" ? `${viewToStart}%` : "--"}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}><Ionicons name="arrow-forward-outline" size={18} color={PRIMARY} /></View>
            <Text style={s.kpiCardLabelLight}>Bắt đầu → Xác nhận</Text>
            <Text style={s.kpiCardValueLight}>{typeof startToConfirm === "number" ? `${startToConfirm}%` : "--"}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}><Ionicons name="arrow-forward-outline" size={18} color={PRIMARY} /></View>
            <Text style={s.kpiCardLabelLight}>Xác nhận → Hoàn tất</Text>
            <Text style={s.kpiCardValueLight}>{typeof confirmToComplete === "number" ? `${confirmToComplete}%` : "--"}</Text>
          </View>
        </View>

        {/* Điểm rơi */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Điểm rơi</Text>
              <Text style={s.dropoffSub}>Tỉ lệ hoàn tất trên lượt xem:</Text>
            </View>
            <Text style={s.dropoffRate}>
              {typeof totalConv === "number" ? `${totalConv}%` : "--"}
            </Text>
          </View>
        </View>

        {/* Support bar */}
        <TouchableOpacity style={s.supportBar} onPress={() => setAiChatVisible(true)} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={18} color="#A0A0A0" style={{ marginRight: 8 }} />
          <Text style={s.supportPlaceholder}>Bạn cần hỗ trợ gì?</Text>
          <View style={s.supportBtn}>
            <Image source={require("../../assets/images/chatbot-speech-bubble.png")} style={{ width: 22, height: 22, tintColor: "#fff" }} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: Cancel ──
  const renderCancel = () => {
    const d = data.cancel || {};
    const totalCancelled = d.totalCancelled ?? "--";
    const totalNoShow = d.totalNoShow ?? "--";
    const cancelRate = d.cancelRate != null ? `${d.cancelRate}%` : "--";
    const reasons: Array<{ reason: string; count: number }> = d.cancelReasons || [];
    const maxReason = Math.max(...reasons.map(r => r.count), 1);

    // Map reason names to Vietnamese
    const reasonNameMap: Record<string, string> = {
      "customer_cancel": "Khách tự hủy",
      "admin_override": "Admin can thiệp",
      "payment_timeout": "Hết thời gian thanh toán",
      "auto_expired": "Tự động hủy quá hạn",
      "restaurant_declined": "Nhà hàng từ chối",
      "Hết thời gian thanh toán": "Hết thời gian thanh toán",
      "Nhà hàng không xác nhận": "Nhà hàng không xác nhận",
      "Admin override": "Admin can thiệp",
      "Tự động hủy do quá hạn": "Tự động hủy quá hạn",
    };
    const getReasonLabel = (reason: string) => reasonNameMap[reason] || reason;

    const topReason = reasons[0];
    const conclusionTitle = topReason
      ? `Lý do chính: "${getReasonLabel(topReason.reason)}" chiếm ${topReason.count} đơn (${Math.round((topReason.count / (d.totalCancelled || 1)) * 100)}%)`
      : "Chưa có dữ liệu hủy đơn trong kỳ";

    return (
      <View style={s.tabContent}>
        {/* 3 KPI cards */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: PRIMARY }]}>
              <Ionicons name="close-outline" size={20} color="#fff" />
            </View>
            <Text style={s.kpiCardLabelLight}>Đơn hủy</Text>
            <Text style={s.kpiCardValueLight}>{totalCancelled}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: PRIMARY }]}>
              <Ionicons name="person-remove-outline" size={20} color="#fff" />
            </View>
            <Text style={s.kpiCardLabelLight}>No-show</Text>
            <Text style={s.kpiCardValueLight}>{totalNoShow}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: PRIMARY }]}>
              <Ionicons name="trending-down-outline" size={20} color="#fff" />
            </View>
            <Text style={s.kpiCardLabelLight}>Tỉ lệ hủy</Text>
            <Text style={s.kpiCardValueLight}>{cancelRate}</Text>
          </View>
        </View>

        {/* Lý do hủy */}
        {reasons.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Lý do hủy</Text>
            {reasons.map((r, i) => {
              const pct = Math.round((r.count / maxReason) * 100);
              return (
                <View key={i} style={s.reasonRow}>
                  <Text style={s.reasonLabel}>{getReasonLabel(r.reason)}</Text>
                  <View style={s.reasonBarTrack}>
                    <View style={[s.reasonBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={s.reasonCount}>{r.count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Kết luận */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={s.conclusionIcon}>
              <Ionicons name="warning-outline" size={28} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Kết luận</Text>
              <Text style={s.conclusionText}>{conclusionTitle}</Text>
              {reasons.length > 1 && (
                <Text style={[s.conclusionText, { marginTop: 8 }]}>
                  Cần xem xét: "{getReasonLabel(reasons[1]?.reason)}" cũng chiếm {reasons[1]?.count} đơn. Đề xuất cải thiện quy trình để giảm tỉ lệ hủy.
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ── Render: Peak ──
  const renderPeak = () => {
    const d = data.peak || {};
    const peakHours: Array<{ dayOfWeek: number; hour: number; bookings: number }> = d.peakHours || [];
    const top5 = peakHours.slice(0, 5);
    const maxBookings = Math.max(...top5.map(p => p.bookings), 1);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    const topSlot = top5[0];
    const peakTimeLabel = topSlot ? `${dayNames[topSlot.dayOfWeek]} ${String(topSlot.hour).padStart(2, "0")}:00` : "--";
    const totalPeakBookings = top5.reduce((sum, p) => sum + p.bookings, 0);

    // Bar colors based on rank
    const barColors = ["#FF8F1F", "#FFB866", "#FFD4A3", "#FFF3E0", "#FFF8F2"];

    // Generate operational insights
    const insight1 = topSlot
      ? `Ưu tiên xác nhận đơn vào ${peakTimeLabel} — khung giờ đông khách nhất (${topSlot.bookings} lượt)`
      : "Chưa có dữ liệu khung giờ cao điểm";
    const insight2 = peakHours.length > 1
      ? `Bố trí đủ nhân viên và bàn cho ${dayNames[top5[0]?.dayOfWeek]} — ngày có lượng đặt cao nhất`
      : "Bố trí nhân sự linh hoạt theo khung giờ đặt đông";

    return (
      <View style={s.tabContent}>
        {/* Top 2 KPI cards */}
        <View style={s.kpiRow}>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="time-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Khung giờ cao nhất</Text>
              <Text style={s.kpiGridValue}>{peakTimeLabel}</Text>
            </View>
          </View>
          <View style={s.kpiGridCard}>
            <View style={s.kpiGridIcon}>
              <Ionicons name="trending-up-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiGridLabel}>Tổng lượt đỉnh</Text>
              <Text style={s.kpiGridValue}>{totalPeakBookings || "--"}</Text>
            </View>
          </View>
        </View>

        {/* Khung giờ đông khách */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Khung giờ đông khách</Text>
          {top5.length > 0 ? (
            <View>
              {/* Grid lines + bars */}
              <View style={s.peakChart}>
                {/* Vertical grid lines */}
                {[0, 1, 2, 3, 4, 5].map(v => (
                  <View key={v} style={[s.peakGridLine, { left: `${(v / 5) * 100}%` }]} />
                ))}
                {/* Bars */}
                {top5.map((p, i) => {
                  const barWidth = Math.round((p.bookings / maxBookings) * 100);
                  return (
                    <View key={i} style={s.peakRow}>
                      <Text style={s.peakTimeLabel}>{dayNames[p.dayOfWeek]} {String(p.hour).padStart(2, "0")}:00</Text>
                      <View style={s.peakBarWrap}>
                        <View style={[s.peakBar, { width: `${barWidth}%`, backgroundColor: barColors[i] }]} />
                      </View>
                      <Text style={s.peakCount}>{p.bookings}</Text>
                    </View>
                  );
                })}
                {/* X-axis labels */}
                <View style={s.peakAxis}>
                  {[0, 1, 2, 3, 4, 5].map(v => (
                    <Text key={v} style={s.peakAxisLabel}>{v}</Text>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <Text style={s.emptyHint}>Đang tải dữ liệu...</Text>
          )}
        </View>

        {/* Gợi ý vận hành */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Gợi ý vận hành</Text>
          <View style={s.insightItem}>
            <View style={s.insightIcon}>
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={s.insightText}>{insight1}</Text>
          </View>
          <View style={s.insightItem}>
            <View style={s.insightIcon}>
              <Ionicons name="restaurant-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={s.insightText}>{insight2}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Render: Other tabs ──
  const renderOther = (tab: TabKey) => {
    const tabLabel = TABS.find(t => t.key === tab)?.label || tab;
    let d: any = {};
    switch (tab) {
      case "cancel": d = data.cancel || {}; break;
    }
    const hasData = Object.keys(d).length > 0 && (d.totalBookings || d.totalUsers || d.totalRevenue);

    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <Text style={s.cardTitle}>{tabLabel}</Text>
          {hasData ? (
            <View style={{ gap: 8 }}>
              {Object.entries(d).slice(0, 10).map(([key, val]: [string, any]) => {
                if (typeof val === "object" || Array.isArray(val)) return null;
                return (
                  <View key={key} style={s.dataRow}>
                    <Text style={s.dataLabel}>{key}</Text>
                    <Text style={s.dataValue}>{String(val)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Text style={s.emptyHint}>Đang tải dữ liệu...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      );
    }
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "users") return renderUsers();
    if (activeTab === "booking") return renderBooking();
    if (activeTab === "cancel") return renderCancel();
    if (activeTab === "peak") return renderPeak();
    return renderOther(activeTab);
  };

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* Header — orange gradient */}
        <LinearGradient colors={["#FF8B25", "#FFD109"]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={s.headerTitle}>Phân tích</Text>
          <View style={s.periodRow}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[s.periodBtn, active && s.periodBtnActive]}
                  onPress={() => setPeriod(p.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.periodText, active && s.periodTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {/* Tab bar — fixed row with dividers */}
        <View style={s.tabBarOuter}>
          <View style={s.tabRow}>
            {TABS.map((tab, idx) => {
              const active = activeTab === tab.key;
              const showDivider = idx < TABS.length - 1;
              return (
                <React.Fragment key={tab.key}>
                  <TouchableOpacity
                    style={s.tabItem}
                    onPress={() => { setActiveTab(tab.key); setLoading(true); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={tab.icon as any} size={15} color={active ? PRIMARY : TEXT_SEC} />
                    <Text style={[s.tabText, active && s.tabTextActive]} numberOfLines={1}>{tab.label}</Text>
                    {active && <View style={s.tabUnderline} />}
                  </TouchableOpacity>
                  {showDivider && <View style={s.tabDivider} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {renderContent()}
        <View style={{ height: 80 }} />
      </ScrollView>
      <AdminAIChat showFab={false} visible={aiChatVisible} onToggle={setAiChatVisible} />
      <AdminBottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // Header
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  periodBtnActive: { backgroundColor: "#FFFFFF" },
  periodText: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "rgba(255,255,255,0.7)" },
  periodTextActive: { color: "#FF8F1F", fontFamily: "Montserrat_700Bold", fontWeight: "700" },

  // Tab bar
  tabBarOuter: { backgroundColor: "#FFFFFF", marginHorizontal: 12, borderRadius: 14, marginBottom: 12, paddingVertical: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  tabRow: { flexDirection: "row", alignItems: "center" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 6, position: "relative" },
  tabDivider: { width: 1, height: 28, backgroundColor: "#E5E7EB" },
  tabText: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC, marginTop: 1 },
  tabTextActive: { color: PRIMARY, fontFamily: "Montserrat_700Bold", fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: 0, height: 3, width: 24, borderRadius: 2, backgroundColor: PRIMARY },

  // Content
  tabContent: { paddingHorizontal: 12, gap: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },

  // KPI cards
  kpiRow: { flexDirection: "row", gap: 6 },
  kpiCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#EEF0F3",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  kpiIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiCardLabel: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC, textAlign: "center" },
  kpiCardValue: { fontSize: 20, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, marginTop: 2 },
  kpiCardLabelLight: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC, textAlign: "center" },
  kpiCardValueLight: { fontSize: 18, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, marginTop: 2 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#EEF0F3",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 17, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, marginBottom: 14 },

  // Donut
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  donutWrap: { alignItems: "center", justifyContent: "center" },
  donutLegend: { flex: 1, gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 14, color: TEXT_SEC, fontFamily: "Montserrat_500Medium", fontWeight: "500", flex: 1 },
  legendValue: { fontSize: 15, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  legendDivider: { height: 1, backgroundColor: "#E5E7EB" },

  // Highlights
  highlightItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  highlightIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  highlightLabel: { fontSize: 13, color: TEXT_SEC, fontFamily: "Montserrat_500Medium", fontWeight: "500" },
  highlightValue: { fontSize: 16, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, marginTop: 2 },

  // Support bar
  supportBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 28, paddingHorizontal: 16, paddingRight: 4, height: 48,
    borderWidth: 1.5, borderColor: PRIMARY, marginTop: 30, marginBottom: 12,
  },
  supportPlaceholder: { flex: 1, fontSize: 16, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#A0A0A0" },
  supportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },

  // Data rows (other tabs)
  dataRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dataLabel: { fontSize: 13, color: TEXT_SEC, fontFamily: "Montserrat_400Regular" },
  dataValue: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },

  emptyHint: { fontSize: 13, color: TEXT_SEC, fontFamily: "Montserrat_400Regular" },

  // Users tab
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiGridCard: {
    width: "47%", flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: CARD, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "#EEF0F3",
  },
  kpiGridIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  kpiGridLabel: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT_SEC },
  kpiGridValue: { fontSize: 22, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, marginTop: 2 },

  // Insights
  insightItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  insightIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  insightText: { fontSize: 13, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: TEXT, flex: 1 },

  // Funnel
  funnelRow: { flexDirection: "row", alignItems: "stretch", gap: 4 },
  funnelShapes: { alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  funnelTier: { height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  funnelValues: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  funnelValue: { fontSize: 16, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  funnelLabel: { fontSize: 10, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC },
  funnelConv: { alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  convPill: { backgroundColor: "#FFF3E0", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  convPillText: { fontSize: 9, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: PRIMARY },
  convRate: { fontSize: 15, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: PRIMARY },

  // Drop-off
  dropoffSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, marginTop: 2 },
  dropoffRate: { fontSize: 36, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: PRIMARY },

  // Reason bars
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  reasonLabel: { fontSize: 12, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: TEXT, width: 130 },
  reasonBarTrack: { flex: 1, height: 18, backgroundColor: "#FFF3E0", borderRadius: 9, overflow: "hidden" },
  reasonBarFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 9 },
  reasonCount: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 30, textAlign: "right" },

  // Conclusion
  conclusionIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  conclusionText: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, lineHeight: 20 },

  // Peak chart
  peakChart: { position: "relative", paddingLeft: 70, paddingRight: 30 },
  peakGridLine: { position: "absolute", top: 0, bottom: 24, width: 1, borderLeftWidth: 1, borderLeftColor: "#E5E7EB", borderStyle: "dotted" },
  peakRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  peakTimeLabel: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 65, marginLeft: -70 },
  peakBarWrap: { flex: 1, height: 22, backgroundColor: "#FFF3E0", borderRadius: 6, overflow: "hidden" },
  peakBar: { height: "100%", borderRadius: 6 },
  peakCount: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 28, textAlign: "right" },
  peakAxis: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 70, paddingRight: 30, marginTop: 4 },
  peakAxisLabel: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: "#9CA3AF", textAlign: "center" },
});
