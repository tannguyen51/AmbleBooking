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
import FunnelChart from "../../components/analytics/FunnelChart";
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
          <KpiCard icon="cash" label="Revenue" value={`${((d.totalRevenue || 0) / 1000000).toFixed(1)}M`} color="#16A34A" trend={calcTrend(d.totalRevenue, p.totalRevenue)} />
        </View>
        <View style={s.kpiRow}>
          <KpiCard icon="people" label="Today" value={d.todayBookings || 0} color="#2563EB" />
          <KpiCard icon="checkmark" label="Completed" value={`${d.completionRate || 0}%`} color="#16A34A" />
        </View>
        <View style={s.card}>
          <SectionTitle title="Monthly Trend" icon="trending-up" />
          <LineChart data={[{ label: "W1", value: 0 }, { label: "W2", value: 0 }]} lineColor={PRIMARY} />
          <Text style={s.emptyHint}>Data accumulates as bookings are made</Text>
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
        {d.dailyActive?.length > 0 && (
          <View style={s.card}>
            <SectionTitle title="Daily Active Users" icon="trending-up" />
            <LineChart data={d.dailyActive.map((da: any) => ({ label: da.date.slice(5), value: da.count }))} lineColor="#2563EB" />
          </View>
        )}
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
    const steps = [
      { label: "🏪 Restaurant Views", value: d.restaurantViews || 0 },
      { label: "📋 Booking Started", value: d.bookingStarted || 0 },
      { label: "✅ Booking Completed", value: d.bookingCompleted || 0 },
      { label: "✔ Confirmed", value: d.bookingConfirmed || 0 },
    ];
    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <SectionTitle title="Booking Funnel" icon="funnel" />
          <View style={s.conversionRow}>
            <View style={s.convItem}><Text style={s.convVal}>{conv.viewToStart || 0}%</Text><Text style={s.convLabel}>View→Start</Text></View>
            <View style={s.convItem}><Text style={s.convVal}>{conv.startToBook || 0}%</Text><Text style={s.convLabel}>Start→Book</Text></View>
            <View style={s.convItem}><Text style={s.convVal}>{conv.bookToConfirm || 0}%</Text><Text style={s.convLabel}>Book→Confirm</Text></View>
          </View>
          <FunnelChart steps={steps} />
        </View>
      </View>
    );
  };

  const renderTables = () => {
    const d = data.tables || {};
    const ratio = d.tableTypeRatio || {};
    const hasData = d.totalBookings > 0;
    return (
      <View style={s.tabContent}>
        <View style={s.kpiRow}>
          <KpiCard icon="star" label="VIP Bookings" value={d.vipTableBookings || 0} color="#E69A00" />
          <KpiCard icon="grid" label="Standard" value={d.standardTableBookings || 0} color="#6B7280" />
        </View>
        {hasData ? (
          <View style={s.card}>
            <SectionTitle title="Table Type Ratio" icon="pie-chart" />
            <View style={s.pieRow}>
              <PieChart data={[
                { label: "VIP", value: ratio.vip || 0, color: "#E69A00" },
                { label: "View", value: ratio.view || 0, color: "#2563EB" },
                { label: "Regular", value: ratio.regular || 0, color: "#16A34A" },
                { label: "Standard", value: ratio.standard || 0, color: "#6B7280" },
              ]} />
              <View style={s.legendCol}>
                {[{ l: "VIP", c: "#E69A00" }, { l: "View", c: "#2563EB" }, { l: "Regular", c: "#16A34A" }, { l: "Standard", c: "#6B7280" }].map((x, i) => (
                  <View key={i} style={s.legendItem}><View style={[s.legendDot, { backgroundColor: x.c }]} /><Text style={s.legendText}>{x.l} {ratio[x.l.toLowerCase()] || 0}%</Text></View>
                ))}
              </View>
            </View>
          </View>
        ) : <View style={s.card}><Text style={s.emptyHint}>No booking data yet</Text></View>}
        {hasData && (
          <View style={s.card}>
            <SectionTitle title="Popularity by Type" icon="bar-chart" />
            <BarChart data={[
              { label: "VIP", value: ratio.vip || 0, color: "#E69A00" },
              { label: "View", value: ratio.view || 0, color: "#2563EB" },
              { label: "Reg", value: ratio.regular || 0, color: "#16A34A" },
              { label: "Std", value: ratio.standard || 0, color: "#6B7280" },
            ]} />
          </View>
        )}
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
            <BarChart data={peakHours.slice(0, 5).map((p: any) => ({
              label: `${p.hour}:00`,
              value: p.bookings,
              color: p.bookings > 30 ? "#FF6B35" : p.bookings > 15 ? "#E69A00" : "#2563EB",
            }))} />
            <Text style={s.insight}>⚡ Peak: Day {peakHours[0]?.dayOfWeek} at {peakHours[0]?.hour}:00 ({peakHours[0]?.bookings || 0})</Text>
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
  conversionRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  convItem: { alignItems: "center" },
  convVal: { fontSize: 18, fontWeight: "700", color: PRIMARY },
  convLabel: { fontSize: 10, color: TEXT_SEC, marginTop: 2 },
  reasonRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  reasonLabel: { fontSize: 11, color: TEXT_SEC, width: 120 },
  reasonBar: { flex: 1, height: 16, backgroundColor: CARD2, borderRadius: 8, marginHorizontal: 6, overflow: "hidden" },
  reasonFill: { height: "100%", backgroundColor: "#DC2626", borderRadius: 8 },
  reasonCount: { fontSize: 12, fontWeight: "700", color: TEXT, width: 30, textAlign: "right" },
  heatmapSub: { fontSize: 11, color: TEXT_SEC, marginBottom: 12, marginTop: -8 },
  insight: { fontSize: 12, color: PRIMARY, fontWeight: "600", marginTop: 12, textAlign: "center" },
  emptyHint: { fontSize: 12, color: TEXT_SEC, textAlign: "center", padding: 20 },
});
