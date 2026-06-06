import React, { useState, useCallback } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { analyticsAPI, adminAnalyticsAPI } from "../../services/api";
// api is resolved via callApi wrapper below
import KpiCard from "../../components/analytics/KpiCard";
import BarChart from "../../components/analytics/BarChart";
import LineChart from "../../components/analytics/LineChart";
import PieChart from "../../components/analytics/PieChart";
import Heatmap from "../../components/analytics/Heatmap";

const BG = "#F8F9FA";
const CARD = "#FFFFFF";
const CARD2 = "#F3F4F6";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const PRIMARY = "#FF6B35";

type Period = "7days" | "30days" | "90days";
const PERIODS: { key: Period; label: string }[] = [
  { key: "7days", label: "7 ngày" },
  { key: "30days", label: "30 ngày" },
  { key: "90days", label: "90 ngày" },
];

type TabKey = "overview" | "users" | "booking" | "tables" | "cancel" | "ai" | "peak";
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "stats-chart" },
  { key: "users", label: "Users", icon: "people" },
  { key: "booking", label: "Booking", icon: "calendar" },
  { key: "tables", label: "Tables", icon: "grid" },
  { key: "cancel", label: "Cancel", icon: "close-circle" },
  { key: "ai", label: "AI", icon: "chatbubbles" },
  { key: "peak", label: "Peak Hours", icon: "time" },
];

const getDateRange = (p: Period) => {
  const end = new Date().toISOString().slice(0, 10);
  const ms = p === "7days" ? 7 : p === "30days" ? 30 : 90;
  const start = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
};

const calcTrend = (current: number, previous: number): { value: number; isUp: boolean } | undefined => {
  if (previous === 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), isUp: pct >= 0 };
};

interface Props { isAdmin?: boolean }

export default function AnalyticsScreen({ isAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<Period>("30days");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({});
  const api = isAdmin ? adminAnalyticsAPI : analyticsAPI;

  // Wrap admin API calls to shift params: adminAPI(restaurantId, from, to) → call(from, to)
  const callApi = useCallback((method: string, from?: string, to?: string) => {
    const fn = (api as any)[method];
    if (!fn) return Promise.reject(new Error("Unknown method"));
    if (isAdmin) {
      // adminAPI: (restaurantId?, from?, to?) → skip restaurantId for system-wide
      return fn(undefined, from, to);
    }
    return fn(from, to);
  }, [api, isAdmin]);

  const fetchTab = useCallback(async (tab: TabKey, p: Period) => {
    const { from, to } = getDateRange(p);
    const ms = p === "7days" ? 14 : p === "30days" ? 60 : 180;
    const prevFrom = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
    const prevTo = from;

    try {
      switch (tab) {
        case "overview": {
          const [res, prevRes] = await Promise.all([
            callApi("getOverview", from, to),
            callApi("getOverview", prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, overview: res.data.data, overviewPrev: prevRes.data.data }));
          break;
        }
        case "users": {
          const [res, prevRes] = await Promise.all([
            callApi("getUserActivity", from, to),
            callApi("getUserActivity", prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, users: res.data.data, usersPrev: prevRes.data.data }));
          break;
        }
        case "booking": {
          const res = await callApi("getBookingFunnel", from, to);
          setData((d: any) => ({ ...d, funnel: res.data.data }));
          break;
        }
        case "tables": {
          const res = await callApi("getTableSelection", from, to);
          setData((d: any) => ({ ...d, tables: res.data.data }));
          break;
        }
        case "cancel": {
          const [res, prevRes] = await Promise.all([
            callApi("getCancellationMetrics", from, to),
            callApi("getCancellationMetrics", prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, cancel: res.data.data, cancelPrev: prevRes.data.data }));
          break;
        }
        case "ai": {
          const [res, prevRes] = await Promise.all([
            callApi("getAIMetrics", from, to),
            callApi("getAIMetrics", prevFrom, prevTo),
          ]);
          setData((d: any) => ({ ...d, ai: res.data.data, aiPrev: prevRes.data.data }));
          break;
        }
        case "peak": {
          const res = await callApi("getPeakHours", from, to);
          setData((d: any) => ({ ...d, peak: res.data.data }));
          break;
        }
      }
    } catch (err) {
      console.error("[analytics]", err);
    }
  }, [api]);

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

  const SectionTitle = ({ title, icon }: { title: string; icon?: string }) => (
    <View style={s.sectionHeader}>
      {icon && <Ionicons name={icon as any} size={14} color={PRIMARY} />}
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  const renderOverview = () => {
    const d = data.overview || {};
    const p = data.overviewPrev || {};
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="calendar" label="Total Bookings" value={d.totalBookings || 0} color={PRIMARY} trend={calcTrend(d.totalBookings, p.totalBookings)} />
          <KpiCard icon="cash" label="Revenue" value={`${(d.totalRevenue || 0).toLocaleString("vi-VN")} vnd`} color="#16A34A" trend={calcTrend(d.totalRevenue, p.totalRevenue)} />
        </View>
        <View style={s.kpiRow}>
          <KpiCard icon="people" label="Today" value={d.todayBookings || 0} color="#2563EB" />
          <KpiCard icon="checkmark" label="Completed" value={`${d.completionRate || 0}%`} color="#16A34A" />
        </View>
        <View style={s.card}>
          <SectionTitle title="Period Summary" icon="trending-up" />
          {d.totalBookings > 0 ? (
            <View>
              <BarChart data={[
                { label: "Total", value: d.totalBookings || 0, color: PRIMARY },
                { label: "Completed", value: d.completedBookings || 0, color: "#16A34A" },
                { label: "Cancelled", value: d.cancelledBookings || 0, color: "#EF4444" },
              ]} showPercent />
              <View style={s.trendLegend}>
                <View style={s.legendRow}>
                  <View style={[s.legendDotS, { backgroundColor: PRIMARY }]} />
                  <Text style={s.legendTextS}>Total bookings in period</Text>
                </View>
                <View style={s.legendRow}>
                  <View style={[s.legendDotS, { backgroundColor: "#16A34A" }]} />
                  <Text style={s.legendTextS}>Completed</Text>
                </View>
                <View style={s.legendRow}>
                  <View style={[s.legendDotS, { backgroundColor: "#EF4444" }]} />
                  <Text style={s.legendTextS}>Cancelled</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={s.emptyHint}>Data accumulates as bookings are made</Text>
          )}
        </View>
      </View>
    );
  };

  const renderUsers = () => {
    const d = data.users || {};
    const p = data.usersPrev || {};
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="people" label="Total Users" value={d.totalUsers || 0} color="#2563EB" trend={calcTrend(d.totalUsers, p.totalUsers)} />
          <KpiCard icon="person-add" label="New" value={d.newUsers || 0} color="#16A34A" trend={calcTrend(d.newUsers, p.newUsers)} />
        </View>
        <View style={s.kpiRow}>
          <KpiCard icon="refresh" label="Returning" value={d.returningUsers || 0} color={PRIMARY} trend={calcTrend(d.returningUsers, p.returningUsers)} />
          <KpiCard icon="people" label="Active/Day" value={d.dailyActive?.[0]?.count || 0} color="#8B5CF6" />
        </View>
        {d.totalUsers > 0 && (
          <View style={s.card}>
            <SectionTitle title="User Ratio" icon="pie-chart" />
            <View style={s.pieRow}>
              <PieChart data={[
                { label: "New", value: d.newUsers || 0, color: "#2563EB" },
                { label: "Returning", value: d.returningUsers || 0, color: PRIMARY },
              ]} />
              <View style={s.legendCol}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#2563EB" }]} /><Text style={s.legendText}>New {d.newUsers || 0}</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: PRIMARY }]} /><Text style={s.legendText}>Returning {d.returningUsers || 0}</Text></View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderBooking = () => {
    const d = data.funnel?.funnel || {};
    const conv = data.funnel?.funnelConversion || {};
    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <SectionTitle title="Booking Funnel" icon="funnel" />
          <View style={s.conversionRow}>
            <View style={s.convItem}><Text style={s.convVal}>{conv.viewToTable || 0}%</Text><Text style={s.convLabel}>Views→Tables</Text></View>
            <View style={s.convItem}><Text style={s.convVal}>{conv.tableToStart || 0}%</Text><Text style={s.convLabel}>Tables→Start</Text></View>
            <View style={s.convItem}><Text style={s.convVal}>{conv.startToBook || 0}%</Text><Text style={s.convLabel}>Start→Book</Text></View>
            <View style={s.convItem}><Text style={s.convVal}>{conv.bookToConfirm || 0}%</Text><Text style={s.convLabel}>Book→Confirm</Text></View>
          </View>
          <BarChart data={[
            { label: "Views", value: d.restaurantViews || 0, color: "#3B82F6" },
            { label: "Tables", value: d.tableViews || 0, color: "#8B5CF6" },
            { label: "Started", value: d.bookingStarted || 0, color: PRIMARY },
            { label: "Completed", value: d.bookingCompleted || 0, color: "#16A34A" },
            { label: "Confirmed", value: d.bookingConfirmed || 0, color: "#E69A00" },
          ]} showPercent />
          <View style={s.funnelNote}>
            <Text style={s.funnelNoteText}>
              Conversion rates show % drop-off between steps.
              If Views is 0 but Started has data, conversion shows 0% because the first step has no data.
            </Text>
            <View style={s.funnelLegend}>
              <View style={s.legendRow}><View style={[s.legendDotS, { backgroundColor: "#3B82F6" }]} /><Text style={s.legendTextS}>Restaurant Views</Text></View>
              <View style={s.legendRow}><View style={[s.legendDotS, { backgroundColor: "#8B5CF6" }]} /><Text style={s.legendTextS}>Table Views</Text></View>
              <View style={s.legendRow}><View style={[s.legendDotS, { backgroundColor: PRIMARY }]} /><Text style={s.legendTextS}>Booking Started</Text></View>
              <View style={s.legendRow}><View style={[s.legendDotS, { backgroundColor: "#16A34A" }]} /><Text style={s.legendTextS}>Booking Completed</Text></View>
              <View style={s.legendRow}><View style={[s.legendDotS, { backgroundColor: "#E69A00" }]} /><Text style={s.legendTextS}>Confirmed by restaurant</Text></View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTables = () => {
    const d = data.tables || {};
    const ratio = d.tableTypeRatio || {};
    const hasData = d.totalBookings > 0;
    const tableTypes = [
      { key: "vip", label: "VIP", color: "#E69A00" },
      { key: "view", label: "View", color: "#2563EB" },
      { key: "standard", label: "Standard", color: "#6B7280" },
    ];
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="star" label="VIP Bookings" value={d.vipTableBookings || 0} color="#E69A00" />
          <KpiCard icon="eye" label="View Bookings" value={d.viewTableBookings || 0} color="#2563EB" />
          <KpiCard icon="grid" label="Standard" value={d.standardTableBookings || 0} color="#6B7280" />
        </View>
        {hasData ? (
          <View style={s.card}>
            <SectionTitle title="Table Type Ratio" icon="pie-chart" />
            <View style={s.pieRow}>
              {(() => {
                // Dùng actual count nếu có, ước lượng từ ratio nếu backend chưa trả về
                const getCount = (key: string) => {
                  if (key === "vip") return d.vipTableBookings;
                  if (key === "view") return d.viewTableBookings;
                  if (key === "standard") return d.standardTableBookings;
                  return 0;
                };
                const totalBookings = d.totalBookings || 1;
                const countSum = tableTypes.reduce((sum, t) => sum + (getCount(t.key) ?? Math.round(totalBookings * (ratio[t.key] || 0) / 100)), 0) || 1;
                return (
                  <>
                    <PieChart data={tableTypes.map((t) => ({
                      label: t.label,
                      value: getCount(t.key) ?? Math.round(totalBookings * (ratio[t.key] || 0) / 100),
                      color: t.color,
                    }))} size={180} />
                    <View style={s.legendCol}>
                      {tableTypes.map((t) => {
                        const count = getCount(t.key) ?? Math.round(totalBookings * (ratio[t.key] || 0) / 100);
                        const pct = Math.round((count / countSum) * 100);
                        return (
                          <View key={t.key} style={s.legendItem}>
                            <View style={[s.legendDot, { backgroundColor: t.color }]} />
                            <Text style={s.legendText}>{t.label} {count} ({pct}%)</Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                );
              })()}
            </View>
          </View>
        ) : <View style={s.card}><Text style={s.emptyHint}>No booking data yet</Text></View>}
      </View>
    );
  };

  const renderCancel = () => {
    const d = data.cancel || {};
    const p = data.cancelPrev || {};
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="close-circle" label="Cancelled" value={d.totalCancelled || 0} color="#DC2626" trend={calcTrend(d.totalCancelled, p.totalCancelled)} />
          <KpiCard icon="eye-off" label="No-Show" value={d.totalNoShow || 0} color="#E69A00" trend={calcTrend(d.totalNoShow, p.totalNoShow)} />
        </View>
        <View style={s.kpiRow}>
          <KpiCard icon="trending-down" label="Cancel Rate" value={`${d.cancelRate || 0}%`} color="#DC2626" />
          <KpiCard icon="trending-up" label="No-Show Rate" value={`${d.noShowRate || 0}%`} color="#E69A00" />
        </View>
        {d.cancelReasons?.length > 0 && (
          <View style={s.card}>
            <SectionTitle title="Cancellation Reasons" icon="list" />
            {d.cancelReasons.map((r: any, i: number) => (
              <View key={i} style={s.reasonRow}>
                <Text style={s.reasonLabel}>{r.reason?.length > 28 ? r.reason.slice(0, 28) + "..." : r.reason}</Text>
                <View style={s.reasonBar}><View style={[s.reasonFill, { width: `${Math.min((r.count / Math.max(1, ...d.cancelReasons.map((x: any) => x.count))) * 100, 100)}%` }]} /></View>
                <Text style={s.reasonCount}>{r.count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAI = () => {
    const d = data.ai || {};
    const p = data.aiPrev || {};
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="chatbubbles" label="AI Chats" value={d.totalChats || 0} color={PRIMARY} trend={calcTrend(d.totalChats, p.totalChats)} />
          <KpiCard icon="people" label="AI Users" value={d.uniqueUsers || 0} color="#2563EB" />
        </View>
        <View style={s.kpiRow}>
          <KpiCard icon="checkmark-circle" label="AI Bookings" value={d.completedBookings || 0} color="#16A34A" trend={calcTrend(d.completedBookings, p.completedBookings)} />
          <KpiCard icon="trending-up" label="CVR" value={`${d.conversionRate || 0}%`} color={PRIMARY} />
        </View>
      </View>
    );
  };

  const renderPeak = () => {
    const d = data.peak || {};
    const heatmapData = d.heatmap || [];
    const peakHours = d.peakHours || [];
    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <SectionTitle title="Peak Hours Heatmap" icon="time" />
          <Text style={s.heatmapSub}>Booking density by day & hour</Text>
          <Heatmap data={heatmapData} />
        </View>
        {peakHours.length > 0 && (
          <View style={s.card}>
            <SectionTitle title="Top Peak Slots" icon="bar-chart" />
            <Text style={s.heatmapSub}>Top 5 khung giờ có nhiều booking nhất</Text>
            <BarChart data={peakHours.slice(0, 5).map((p: any, i: number) => {
              const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              return {
                label: `${dayNames[p.dayOfWeek] || p.dayOfWeek} ${p.hour}:00`,
                value: p.bookings,
                color: i === 0 ? "#FF6B35" : i === 1 ? "#E69A00" : i === 2 ? "#3B82F6" : "#6B7280",
              };
            })} showPercent />
            <View style={s.funnelNote}>
              <Text style={s.funnelNoteText}>Cột cao nhất = khung giờ đông khách nhất. Màu: cam = rất đông, vàng = đông, xanh = bình thường.</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "users": return renderUsers();
      case "booking": return renderBooking();
      case "tables": return renderTables();
      case "cancel": return renderCancel();
      case "ai": return renderAI();
      case "peak": return renderPeak();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📊 Analytics</Text>
        <View style={s.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.key} style={[s.periodBtn, period === p.key && s.periodBtnActive]} onPress={() => setPeriod(p.key)}>
              <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? "#fff" : TEXT_SEC} />
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}>
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 8 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: CARD2 },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodText: { fontSize: 12, color: TEXT_SEC, fontWeight: "500" },
  periodTextActive: { color: "#fff" },
  tabBar: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: "#333" },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: "row" },
  tab: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD2 },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 12, color: TEXT_SEC, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  scroll: { flex: 1 },
  tabContent: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  kpiRow: { flexDirection: "row", gap: 10 },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: TEXT },
  pieRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  legendCol: { gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: TEXT_SEC },
  trendLegend: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDotS: { width: 10, height: 10, borderRadius: 5 },
  legendTextS: { fontSize: 13, color: TEXT_SEC },
  userHeaderCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  userHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  userTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  userSubtitle: { fontSize: 12, color: TEXT_SEC, marginTop: 2 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  trendBadgeText: { fontSize: 13, fontWeight: "800" },
  userStatRow: { flexDirection: "row", marginTop: 16, alignItems: "center" },
  userStatItem: { flex: 1, alignItems: "center" },
  userStatValue: { fontSize: 20, fontWeight: "900", color: TEXT },
  userStatLabel: { fontSize: 11, color: TEXT_SEC, marginTop: 2 },
  userStatDivider: { width: 1, height: 32, backgroundColor: "#E5E7EB" },
  chartTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  chartSubtitle: { fontSize: 11, color: TEXT_SEC },
  conversionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 4 },
  convItem: { alignItems: "center", flex: 1 },
  convVal: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  convLabel: { fontSize: 9, color: TEXT_SEC, marginTop: 2, textAlign: "center" },
  reasonRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  reasonLabel: { fontSize: 11, color: TEXT_SEC, width: 120 },
  reasonBar: { flex: 1, height: 16, backgroundColor: CARD2, borderRadius: 8, marginHorizontal: 6, overflow: "hidden" },
  reasonFill: { height: "100%", backgroundColor: "#DC2626", borderRadius: 8 },
  reasonCount: { fontSize: 12, fontWeight: "700", color: TEXT, width: 30, textAlign: "right" },
  heatmapSub: { fontSize: 11, color: TEXT_SEC, marginBottom: 12, marginTop: -8 },
  insight: { fontSize: 12, color: PRIMARY, fontWeight: "600", marginTop: 12, textAlign: "center" },
  funnelNote: { marginTop: 12, gap: 8 },
  funnelNoteText: { fontSize: 11, color: TEXT_SEC, fontStyle: "italic", lineHeight: 16 },
  funnelLegend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyHint: { fontSize: 12, color: TEXT_SEC, textAlign: "center", padding: 20 },
});
