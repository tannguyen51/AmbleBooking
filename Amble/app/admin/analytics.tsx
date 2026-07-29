import React, { useState, useCallback } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminAnalyticsAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import AdminAIChat from "../../components/admin/AdminAIChat";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

const { width: SW } = Dimensions.get("window");
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

const getDateRange = (p: PeriodKey) => {
  const end = new Date().toISOString().slice(0, 10);
  const ms = p === "7days" ? 7 : p === "30days" ? 30 : 90;
  const start = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
};

// ── Metric Categories ──────────────────────────────
type CatKey =
  | "users"
  | "search"
  | "funnel"
  | "tables"
  | "cancel"
  | "ai"
  | "engagement"
  | "peak"
  | "survey";

const CATS: { key: CatKey; label: string; icon: string; desc: string }[] = [
  { key: "users", label: "Người dùng", icon: "people", desc: "Đăng ký, hoạt động, quay lại" },
  { key: "search", label: "Tìm kiếm", icon: "search", desc: "Từ khóa, filter, lượt xem" },
  { key: "funnel", label: "Đặt bàn", icon: "calendar", desc: "Phễu chuyển đổi đặt bàn" },
  { key: "tables", label: "Chọn bàn", icon: "grid", desc: "VIP, view, standard" },
  { key: "cancel", label: "Hủy & No-show", icon: "close-circle", desc: "Tỉ lệ, lý do hủy" },
  { key: "ai", label: "AI Assistant", icon: "chatbubble-ellipses", desc: "Chat, gợi ý, chuyển đổi" },
  { key: "engagement", label: "Tương tác", icon: "heart", desc: "Yêu thích, đánh giá, điểm thưởng" },
  { key: "peak", label: "Cao điểm", icon: "time", desc: "Khung giờ đông khách" },
  { key: "survey", label: "Khảo sát", icon: "pulse", desc: "Người dùng biết app từ đâu" },
];

const fmtNum = (n: any) => {
  if (n === undefined || n === null) return "--";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("30days");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({});
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [activeCat, setActiveCat] = useState<CatKey | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch overview (for card badges) ────────────
  const fetchOverview = useCallback(async (p: PeriodKey) => {
    const { from, to } = getDateRange(p);
    try {
      const [ovRes, userRes, peakRes] = await Promise.all([
        adminAnalyticsAPI.getOverview(undefined, from, to),
        adminAnalyticsAPI.getUserActivity(undefined, from, to),
        adminAnalyticsAPI.getPeakHours(undefined, from, to),
      ]);
      setData((d: any) => ({
        ...d,
        overview: ovRes.data.data,
        users: userRes.data.data,
        peak: peakRes.data.data,
      }));
    } catch (err) {
      console.error("[analytics:overview]", err);
    }
  }, []);

  // ── Fetch detail when category clicked ──────────
  const fetchDetail = useCallback(async (cat: CatKey, p: PeriodKey) => {
    const { from, to } = getDateRange(p);
    setDetailLoading(true);
    try {
      let res: any;
      switch (cat) {
        case "search":
          const [sRes, sEg] = await Promise.all([
            adminAnalyticsAPI.getSearchDiscovery(undefined, from, to),
            adminAnalyticsAPI.getEngagement(undefined, from, to),
          ]);
          setData((d: any) => ({ ...d, search: sRes.data.data, engagement: sEg.data.data }));
          break;
        case "funnel":
          res = await adminAnalyticsAPI.getBookingFunnel(undefined, from, to);
          setData((d: any) => ({ ...d, funnel: res.data.data }));
          break;
        case "tables":
          res = await adminAnalyticsAPI.getTableSelection(undefined, from, to);
          setData((d: any) => ({ ...d, tables: res.data.data }));
          break;
        case "cancel":
          const [cRes, cEg] = await Promise.all([
            adminAnalyticsAPI.getCancellationMetrics(undefined, from, to),
            adminAnalyticsAPI.getEngagement(undefined, from, to),
          ]);
          setData((d: any) => ({ ...d, cancel: cRes.data.data, engagement: cEg.data.data }));
          break;
        case "ai":
          const [aRes, aEg] = await Promise.all([
            adminAnalyticsAPI.getAIMetrics(undefined, from, to),
            adminAnalyticsAPI.getEngagement(undefined, from, to),
          ]);
          setData((d: any) => ({ ...d, ai: aRes.data.data, engagement: aEg.data.data }));
          break;
        case "engagement":
          res = await adminAnalyticsAPI.getEngagement(undefined, from, to);
          setData((d: any) => ({ ...d, engagement: res.data.data }));
          break;
        case "survey":
          res = await adminAnalyticsAPI.getSurveyStats();
          setData((d: any) => ({ ...d, survey: res.data.data }));
          break;
      }
    } catch (err) {
      console.error(`[analytics:${cat}]`, err);
    }
    setDetailLoading(false);
  }, []);

  // ── Load on focus ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOverview(period).finally(() => setLoading(false));
    }, [period, fetchOverview])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOverview(period);
    if (activeCat) await fetchDetail(activeCat, period);
    setRefreshing(false);
  }, [period, fetchOverview, fetchDetail, activeCat]);

  const handleCardPress = (cat: CatKey) => {
    setActiveCat(cat);
    // Users and peak are already fetched in overview
    if (cat !== "users" && cat !== "peak") {
      fetchDetail(cat, period);
    }
  };

  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p);
    setActiveCat(null);
  };

  const ov = data.overview || {};
  const us = data.users || {};

  // ── Render: Metric Card ─────────────────────────
  const MetricCard = ({ cat }: { cat: (typeof CATS)[0] }) => {
    return (
      <TouchableOpacity
        style={s.metricCard}
        activeOpacity={0.7}
        onPress={() => handleCardPress(cat.key)}
      >
        <LinearGradient
          colors={["#FFF6ED", "#FFF8F2"]}
          style={s.metricCardInner}
        >
          <View style={s.metricIconWrap}>
            <Ionicons name={cat.icon as any} size={22} color={PRIMARY} />
          </View>
          <Text style={s.metricLabel}>{cat.label}</Text>
          <Text style={s.metricDesc}>{cat.desc}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── Render: Detail Header ───────────────────────
  const DetailHeader = () => {
    const cat = CATS.find((c) => c.key === activeCat);
    if (!cat) return null;
    return (
      <View style={s.detailHeader}>
        <TouchableOpacity onPress={() => setActiveCat(null)} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Ionicons name={cat.icon as any} size={20} color={PRIMARY} />
        <Text style={s.detailTitle}>{cat.label}</Text>
      </View>
    );
  };

  // ── Render: Users Detail ────────────────────────
  const renderUsersDetail = () => {
    const totalUsers = us.totalUsers ?? "--";
    const newUsers = us.newUsers ?? "--";
    const returningUsers = us.returningUsers ?? "--";
    const dailyActive = us.dailyActive?.[us.dailyActive.length - 1]?.count ?? "--";
    const totalForDonut = (us.newUsers || 0) + (us.returningUsers || 0);
    const newPct = totalForDonut > 0 ? Math.round((us.newUsers / totalForDonut) * 100) : 0;
    const retPct = totalForDonut > 0 ? 100 - newPct : 0;
    const donutSegments = totalForDonut > 0 ? [
      { label: "Mới", pct: newPct, color: "#FF8F1F" },
      { label: "Quay lại", pct: retPct, color: "#FFD4A3" },
    ] : [];

    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid2}>
          <KpiCard icon="people-outline" label="Tổng người dùng" value={totalUsers} />
          <KpiCard icon="person-add-outline" label="Người dùng mới" value={newUsers} />
          <KpiCard icon="refresh-outline" label="Quay lại" value={returningUsers} />
          <KpiCard icon="trending-up-outline" label="Hoạt động/ngày" value={dailyActive} />
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Tỉ lệ người dùng</Text>
          <View style={s.donutRow}>
            <View style={s.donutWrap}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                <Circle cx={70} cy={70} r={50} fill="none" stroke="#F3F4F6" strokeWidth={24} />
                {donutSegments.length > 0 && (() => {
                  const circumference = 2 * Math.PI * 50;
                  let cumulative = 0;
                  return donutSegments.map((seg, i) => {
                    const segLen = (seg.pct / 100) * circumference;
                    const offset = circumference * 0.25 - cumulative;
                    cumulative += segLen;
                    return (
                      <Circle key={i} cx={70} cy={70} r={50} fill="none"
                        stroke={seg.color} strokeWidth={24}
                        strokeDasharray={`${segLen} ${circumference - segLen}`}
                        strokeDashoffset={offset} strokeLinecap="butt" />
                    );
                  });
                })()}
                <SvgText x={70} y={70} fill={TEXT} fontSize={26} fontWeight="500" fontFamily="Montserrat_500Medium">{totalForDonut || "--"}</SvgText>
                <SvgText x={70} y={86} fill={TEXT_SEC} fontSize={11} fontFamily="Montserrat_400Regular">Tổng</SvgText>
              </Svg>
            </View>
            <View style={s.donutLegend}>
              <LegendItem color="#FF8F1F" label="Mới" value={`${newUsers} (${newPct}%)`} />
              <LegendItem color="#FFD4A3" label="Quay lại" value={`${returningUsers} (${retPct}%)`} />
              <View style={s.legendDivider} />
              <LegendItem color="" label="Tổng" value={`${totalForDonut || "--"}`} bold />
            </View>
          </View>
        </View>
        <InsightCard icon="star-outline" text={`${newPct}% là người dùng mới`} />
      </ScrollView>
    );
  };

  // ── Render: Search Detail ───────────────────────
  const renderSearchDetail = () => {
    const sd = data.search || {};
    const eg = data.engagement || {};
    const viewEvents = typeof sd.totalSearches === "number" && typeof sd.searchToViewRate === "number"
      ? Math.round((sd.totalSearches * sd.searchToViewRate) / 100) : "--";
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid2}>
          <KpiCard icon="search-outline" label="Tổng lượt tìm" value={sd.totalSearches} />
          <KpiCard icon="person-outline" label="Người dùng tìm" value={sd.uniqueSearchUsers} />
          <KpiCard icon="eye-outline" label="Lượt xem nhà hàng" value={viewEvents} />
          <KpiCard icon="trending-up-outline" label="Tỉ lệ tìm→xem" value={typeof sd.searchToViewRate === "number" ? `${sd.searchToViewRate}%` : "--"} />
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Từ khóa phổ biến</Text>
          {(sd.topKeywords || []).length === 0 ? (
            <Text style={s.emptyText}>Chưa có dữ liệu</Text>
          ) : (
            (sd.topKeywords || []).slice(0, 8).map((kw: any, i: number) => (
              <View key={i} style={s.keywordRow}>
                <Text style={s.keywordRank}>#{i + 1}</Text>
                <Text style={s.keywordText}>{kw.keyword}</Text>
                <Text style={s.keywordCount}>{kw.count} lần</Text>
              </View>
            ))
          )}
        </View>
        {(eg.filterUsage || []).length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Bộ lọc dùng nhiều</Text>
            {eg.filterUsage.slice(0, 5).map((f: any, i: number) => (
              <View key={i} style={s.keywordRow}>
                <Text style={s.keywordRank}>#{i + 1}</Text>
                <Text style={s.keywordText}>{f.filterName}</Text>
                <Text style={s.keywordCount}>{f.count} lần</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Render: Funnel Detail ───────────────────────
  const renderFunnelDetail = () => {
    const f = data.funnel || {};
    const funnel = f.funnel || {};
    const conv = f.funnelConversion || {};
    const steps = [
      { label: "Xem nhà hàng", value: funnel.restaurantViews ?? "--", color: "#E8F0FE" },
      { label: "Chọn bàn", value: funnel.tableViews ?? "--", color: "#D4E4FC" },
      { label: "Bắt đầu đặt", value: funnel.bookingStarted ?? "--", color: "#B8D4FA" },
      { label: "Gửi đặt bàn", value: funnel.bookingCompleted ?? "--", color: "#8BB8F8" },
      { label: "Xác nhận", value: funnel.bookingConfirmed ?? "--", color: "#5A9AF5" },
    ];
    const maxV = Math.max(...steps.map((s) => (typeof s.value === "number" ? s.value : 0)), 1);

    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Phễu đặt bàn</Text>
          {steps.map((step, i) => {
            const pct = maxV > 0 && typeof step.value === "number" ? Math.round((step.value / maxV) * 100) : 0;
            return (
              <View key={i} style={s.funnelStep}>
                <View style={s.funnelLabelRow}>
                  <Text style={s.funnelLabel}>{step.label}</Text>
                  <Text style={s.funnelValue}>{typeof step.value === "number" ? fmtNum(step.value) : step.value}</Text>
                </View>
                <View style={s.funnelBarBg}>
                  <View style={[s.funnelBarFill, { width: `${pct}%`, backgroundColor: step.color }]} />
                </View>
                {i < steps.length - 1 && typeof step.value === "number" && typeof steps[i + 1].value === "number" && step.value > 0 && (
                  <Text style={s.funnelDrop}>
                    ↓ {Math.round(((step.value - (steps[i + 1].value as number)) / step.value) * 100)}% rơi
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={s.kpiGrid3}>
          <KpiCard icon="eye-outline" label="Xem→Chọn bàn" value={typeof conv.viewToTable === "number" ? `${conv.viewToTable}%` : "--"} />
          <KpiCard icon="arrow-forward-outline" label="Đặt→Xác nhận" value={typeof conv.bookToConfirm === "number" ? `${conv.bookToConfirm}%` : "--"} />
          <KpiCard icon="checkmark-circle-outline" label="Hoàn tất" value={typeof conv.confirmToComplete === "number" ? `${conv.confirmToComplete}%` : "--"} />
        </View>
      </ScrollView>
    );
  };

  // ── Render: Tables Detail ────────────────────────
  const renderTablesDetail = () => {
    const tb = data.tables || {};
    const total = tb.totalBookings || 1;
    const types = [
      { label: "VIP", value: tb.vipTableBookings ?? "--", color: "#FFD700", icon: "diamond-outline" },
      { label: "View", value: tb.viewTableBookings ?? "--", color: "#87CEEB", icon: "eye-outline" },
      { label: "Standard", value: tb.standardTableBookings ?? "--", color: "#A0A0A0", icon: "square-outline" },
    ];
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid2}>
          <KpiCard icon="image-outline" label="Lượt xem ảnh bàn" value={tb.totalTableViewClicks} color="#8B5CF6" />
          <KpiCard icon="grid-outline" label="Tổng đặt bàn" value={tb.totalBookings} />
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Loại bàn được chọn</Text>
          {types.map((t, i) => {
            const pct = typeof t.value === "number" ? Math.round((t.value / total) * 100) : 0;
            return (
              <View key={i} style={s.tableTypeRow}>
                <Ionicons name={t.icon as any} size={20} color={t.color} />
                <Text style={s.tableTypeLabel}>{t.label}</Text>
                <View style={s.tableTypeBarBg}>
                  <View style={[s.tableTypeBarFill, { width: `${pct}%`, backgroundColor: t.color }]} />
                </View>
                <Text style={s.tableTypeVal}>{typeof t.value === "number" ? t.value : "--"}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── Render: Cancel Detail ────────────────────────
  const renderCancelDetail = () => {
    const c = data.cancel || {};
    const eg = data.engagement || {};
    const reasons = c.cancelReasons || [];
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid3}>
          <KpiCard icon="close-circle-outline" label="Đơn hủy" value={c.totalCancelled} color="#EF4444" />
          <KpiCard icon="warning-outline" label="No-show" value={c.totalNoShow} color="#F59E0B" />
          <KpiCard icon="trending-down-outline" label="Tỉ lệ hủy" value={`${c.cancelRate ?? "--"}%`} />
        </View>
        <View style={s.kpiGrid2}>
          <KpiCard icon="alert-circle-outline" label="Tỉ lệ no-show" value={typeof c.noShowRate === "number" ? `${c.noShowRate}%` : "--"} color="#F59E0B" />
          <KpiCard icon="warning-outline" label="Cảnh báo mất cọc" value={eg.depositWarningViews ?? "--"} color="#8B5CF6" />
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Lý do hủy</Text>
          {reasons.length === 0 ? (
            <Text style={s.emptyText}>Chưa có dữ liệu</Text>
          ) : (
            reasons.slice(0, 8).map((r: any, i: number) => (
              <View key={i} style={s.reasonRow}>
                <Text style={s.reasonRank}>#{i + 1}</Text>
                <Text style={s.reasonText}>{r.reason}</Text>
                <Text style={s.reasonCount}>{r.count} lần</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  // ── Render: AI Detail ────────────────────────────
  const renderAIDetail = () => {
    const ai = data.ai || {};
    const eg = data.engagement || {};
    const requests = ai.commonRequests || [];
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid3}>
          <KpiCard icon="chatbubble-ellipses-outline" label="Chat đã bắt đầu" value={ai.totalChats} />
          <KpiCard icon="people-outline" label="Người dùng AI" value={ai.uniqueUsers} />
          <KpiCard icon="checkmark-circle-outline" label="Chuyển đổi" value={typeof ai.conversionRate === "number" ? `${ai.conversionRate}%` : "--"} />
        </View>
        <View style={s.kpiGrid2}>
          <KpiCard icon="bookmark-outline" label="Bấm gợi ý AI" value={eg.aiRecommendClicks ?? "--"} color="#8B5CF6" />
          <KpiCard icon="trending-up-outline" label="Chat→Booking" value={typeof ai.conversionRate === "number" ? `${ai.conversionRate}%` : "--"} />
        </View>
        {requests.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Yêu cầu thường gặp</Text>
            {requests.slice(0, 8).map((r: any, i: number) => (
              <View key={i} style={s.keywordRow}>
                <Text style={s.keywordRank}>#{i + 1}</Text>
                <Text style={s.keywordText}>{r.text}</Text>
                <Text style={s.keywordCount}>{r.count} lần</Text>
              </View>
            ))}
          </View>
        )}
        <InsightCard icon="bulb-outline" text="AI assistant giúp tăng tỉ lệ chuyển đổi đặt bàn" />
      </ScrollView>
    );
  };

  // ── Render: Engagement Detail ────────────────────
  const renderEngagementDetail = () => {
    const eg = data.engagement || {};
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.kpiGrid2}>
          <KpiCard icon="heart-outline" label="Yêu thích" value={eg.totalFavorites} color="#EF4444" />
          <KpiCard icon="star-outline" label="Đánh giá" value={eg.totalReviews} color="#F59E0B" />
          <KpiCard icon="camera-outline" label="Ảnh đánh giá" value={eg.photoReviews} color="#8B5CF6" />
          <KpiCard icon="gift-outline" label="Điểm thưởng dùng" value={eg.rewardPointsUsed} color="#10B981" />
        </View>
        {(eg.filterUsage || []).length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Bộ lọc dùng nhiều</Text>
            {eg.filterUsage.slice(0, 5).map((f: any, i: number) => (
              <View key={i} style={s.keywordRow}>
                <Text style={s.keywordRank}>#{i + 1}</Text>
                <Text style={s.keywordText}>{f.filterName}</Text>
                <Text style={s.keywordCount}>{f.count} lần</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Render: Peak Detail ──────────────────────────
  const renderPeakDetail = () => {
    const pk = data.peak || {};
    const heatmap = pk.heatmap || [];
    const grouped: Record<string, { hour: number; bookings: number }> = {};
    heatmap.forEach((h: any) => {
      const hour = h.hour;
      if (!grouped[hour]) grouped[hour] = { hour, bookings: 0 };
      grouped[hour].bookings += h.bookings || 0;
    });
    const hourly = Object.values(grouped).sort((a: any, b: any) => b.bookings - a.bookings);
    const maxH = Math.max(...hourly.map((h: any) => h.bookings || 0), 1);
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Khung giờ đông khách</Text>
          {hourly.length === 0 ? (
            <Text style={s.emptyText}>Chưa có dữ liệu</Text>
          ) : (
            hourly.map((h: any, i: number) => {
              const pct = Math.round(((h.bookings || 0) / maxH) * 100);
              return (
                <View key={i} style={s.peakRow}>
                  <Text style={s.peakTime}>{h.hour}:00</Text>
                  <View style={s.peakBarBg}>
                    <View style={[s.peakBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={s.peakCount}>{h.bookings}</Text>
                </View>
              );
            })
          )}
        </View>
        <InsightCard icon="bulb-outline" text={`Khung giờ cao điểm nhất: ${ov.peakHour || "--"}`} />
      </ScrollView>
    );
  };

  // ── Render: Survey Detail ──────────────────────────
  const renderSurveyDetail = () => {
    const sv = data.survey || {};
    const sources = sv.sources || [];
    return (
      <ScrollView style={s.detailBody} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Khảo sát người dùng</Text>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 36, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT }}>{sv.total ?? "--"}</Text>
            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC }}>tổng lượt trả lời</Text>
          </View>
          {sources.length === 0 ? (
            <Text style={s.emptyText}>Chưa có dữ liệu</Text>
          ) : (
            sources.map((s: any, i: number) => (
              <View key={i} style={s.surveyRow}>
                <Text style={s.surveyLabel}>{s.label}</Text>
                <View style={s.surveyBarBg}>
                  <View style={[s.surveyBarFill, { width: `${s.pct}%` }]} />
                </View>
                <Text style={s.surveyPct}>{s.count} ({s.pct}%)</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  // ── Render: Detail View ─────────────────────────
  const renderDetail = () => {
    if (!activeCat) return null;
    if (detailLoading) {
      return (
        <View style={s.detailBody}>
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
        </View>
      );
    }
    switch (activeCat) {
      case "users": return renderUsersDetail();
      case "search": return renderSearchDetail();
      case "funnel": return renderFunnelDetail();
      case "tables": return renderTablesDetail();
      case "cancel": return renderCancelDetail();
      case "ai": return renderAIDetail();
      case "engagement": return renderEngagementDetail();
      case "peak": return renderPeakDetail();
      case "survey": return renderSurveyDetail();
      default: return null;
    }
  };

  // ── Main Render ─────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <LinearGradient colors={["#FF8F1F", "#FFB266"]} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Số liệu</Text>
          <TouchableOpacity onPress={() => setAiChatVisible(true)} style={s.aiBtn}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[s.periodChip, period === p.key && s.periodChipActive]}
              onPress={() => handlePeriodChange(p.key)}
            >
              <Text style={[s.periodText, period === p.key && s.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Back button + detail */}
      {activeCat && <DetailHeader />}

      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!activeCat ? (
          /* ── Metric Cards Grid ── */
          <View style={s.metricGrid}>
            {CATS.map((cat) => (
              <MetricCard key={cat.key} cat={cat} />
            ))}
          </View>
        ) : (
          /* ── Detail View ── */
          renderDetail()
        )}
      </ScrollView>

      <AdminBottomNav />
      <AdminAIChat visible={aiChatVisible} onToggle={(v) => setAiChatVisible(v)} />
    </SafeAreaView>
  );
}

// ── Sub-Components ──────────────────────────────────
const KpiCard = ({ icon, label, value, color }: { icon: string; label: string; value: any; color?: string }) => (
  <View style={s.kpiGridCard}>
    <View style={s.kpiGridIcon}>
      <Ionicons name={icon as any} size={20} color={color || PRIMARY} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.kpiGridLabel}>{label}</Text>
      <Text style={s.kpiGridValue}>{fmtNum(value)}</Text>
    </View>
  </View>
);

const LegendItem = ({ color, label, value, bold }: { color: string; label: string; value: string; bold?: boolean }) => (
  <View style={s.legendItem}>
    {color !== "" && <View style={[s.legendDot, { backgroundColor: color }]} />}
    <Text style={[s.legendLabel, bold && { fontWeight: "800" }]}>{label}</Text>
    <Text style={[s.legendValue, bold && { fontWeight: "800" }]}>{value}</Text>
  </View>
);

const InsightCard = ({ icon, text }: { icon: string; text: string }) => (
  <View style={s.card}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={s.insightIcon}>
        <Ionicons name={icon as any} size={16} color={PRIMARY} />
      </View>
      <Text style={s.insightText}>{text}</Text>
    </View>
  </View>
);

// ── Styles ──────────────────────────────────────────
const CARD_W = (SW - 40) / 2;
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerTitle: { fontSize: 22, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
  aiBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  periodRow: { flexDirection: "row", gap: 8 },
  periodChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)" },
  periodChipActive: { backgroundColor: "#fff" },
  periodText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "rgba(255,255,255,0.9)" },
  periodTextActive: { color: PRIMARY },
  scrollArea: { flex: 1 },

  // Metric Cards Grid
  metricGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  metricCard: {
    width: CARD_W, borderRadius: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  metricCardInner: { borderRadius: 14, padding: 16, alignItems: "center", minHeight: 130, justifyContent: "center", borderWidth: 1, borderColor: "#FFF0E0" },
  metricIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF0E0", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  metricLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, marginBottom: 4, textAlign: "center" },
  metricDesc: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, textAlign: "center", lineHeight: 14 },

  // Detail
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD, borderBottomWidth: 1, borderColor: "#F3F4F6" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  detailTitle: { fontSize: 17, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT },
  detailBody: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },

  // KPI Cards
  kpiGrid2: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiGrid3: { flexDirection: "row", gap: 8 },
  kpiGridCard: {
    flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  kpiGridIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF0E0", justifyContent: "center", alignItems: "center" },
  kpiGridLabel: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC },
  kpiGridValue: { fontSize: 18, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, marginTop: 2 },

  // Card
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, marginBottom: 12 },

  // Donut
  donutRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  donutWrap: { alignItems: "center", justifyContent: "center" },
  donutLegend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  legendValue: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT },
  legendDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },

  // Insight
  insightIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF0E0", justifyContent: "center", alignItems: "center" },
  insightText: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, flex: 1 },

  // Funnel
  funnelStep: { marginBottom: 10 },
  funnelLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  funnelLabel: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  funnelValue: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT },
  funnelBarBg: { height: 8, borderRadius: 4, backgroundColor: "#F3F4F6", overflow: "hidden" },
  funnelBarFill: { height: "100%", borderRadius: 4 },
  funnelDrop: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, marginTop: 2, textAlign: "right" },

  // Table Types
  tableTypeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  tableTypeLabel: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 70 },
  tableTypeBarBg: { flex: 1, height: 14, borderRadius: 7, backgroundColor: "#F3F4F6", overflow: "hidden" },
  tableTypeBarFill: { height: "100%", borderRadius: 7 },
  tableTypeVal: { fontSize: 14, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, width: 36, textAlign: "right" },

  // Keywords & Reasons
  keywordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#F3F4F6" },
  keywordRank: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: PRIMARY, width: 28 },
  keywordText: { flex: 1, fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  keywordCount: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: TEXT_SEC },
  reasonRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#F3F4F6" },
  reasonRank: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#EF4444", width: 28 },
  reasonText: { flex: 1, fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT },
  reasonCount: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: TEXT_SEC },

  // Peak
  peakRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  peakTime: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 40 },
  peakBarBg: { flex: 1, height: 16, borderRadius: 8, backgroundColor: "#FFF0E0", overflow: "hidden" },
  peakBarFill: { height: "100%", borderRadius: 8, backgroundColor: PRIMARY },
  peakCount: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, width: 36, textAlign: "right" },

  // Survey
  surveyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  surveyLabel: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT, width: 100 },
  surveyBarBg: { flex: 1, height: 18, borderRadius: 9, backgroundColor: "#FFF0E0", overflow: "hidden" },
  surveyBarFill: { height: "100%", borderRadius: 9, backgroundColor: PRIMARY },
  surveyPct: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, width: 36, textAlign: "right" },

  // Empty
  emptyText: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, textAlign: "center", paddingVertical: 20 },
});
