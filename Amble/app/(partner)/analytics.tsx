import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { analyticsAPI } from "../../services/api";

const PRIMARY = "#FF6B35";
const BG = "#F8F9FA";

type Period = "7days" | "30days" | "90days";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7days", label: "7 ngày" },
  { key: "30days", label: "30 ngày" },
  { key: "90days", label: "90 ngày" },
];

type TabKey =
  | "overview"
  | "users"
  | "search"
  | "funnel"
  | "tables"
  | "cancellation"
  | "ai";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Tổng quan", icon: "stats-chart-outline" },
  { key: "users", label: "Người dùng", icon: "people-outline" },
  { key: "search", label: "Tìm kiếm", icon: "search-outline" },
  { key: "funnel", label: "Phễu", icon: "funnel-outline" },
  { key: "tables", label: "Bàn", icon: "grid-outline" },
  { key: "cancellation", label: "Hủy", icon: "close-circle-outline" },
  { key: "ai", label: "AI", icon: "chatbubbles-outline" },
];

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<Period>("30days");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  const getDateRange = (p: Period) => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(
      Date.now() -
        (p === "7days" ? 7 : p === "30days" ? 30 : 90) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    return { from: start, to: end };
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab, period]),
  );

  const fetchData = async () => {
    setLoading(true);
    const { from, to } = getDateRange(period);
    try {
      let res;
      switch (activeTab) {
        case "overview":
          res = await analyticsAPI.getOverview(from, to);
          setData({ overview: res.data.data });
          break;
        case "users":
          res = await analyticsAPI.getUserActivity(from, to);
          setData({ users: res.data.data });
          break;
        case "search":
          res = await analyticsAPI.getSearchDiscovery(from, to);
          setData({ search: res.data.data });
          break;
        case "funnel":
          res = await analyticsAPI.getBookingFunnel(from, to);
          setData({ funnel: res.data.data });
          break;
        case "tables":
          res = await analyticsAPI.getTableSelection(from, to);
          setData({ tables: res.data.data });
          break;
        case "cancellation":
          res = await analyticsAPI.getCancellationMetrics(from, to);
          setData({ cancellation: res.data.data });
          break;
        case "ai":
          res = await analyticsAPI.getAIMetrics(from, to);
          setData({ ai: res.data.data });
          break;
      }
    } catch (err) {
      console.error("[analytics] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render bar chart (simple colored bars)
  const renderBar = (
    label: string,
    value: number,
    max: number,
    color = PRIMARY,
  ) => (
    <View key={label} style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: max > 0 ? `${(value / max) * 100}%` : "0%",
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={PRIMARY}
          style={{ marginTop: 60 }}
        />
      );
    }

    // Overview Tab
    if (activeTab === "overview" && data.overview) {
      const d = data.overview;
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="calendar-outline"
              label="Tổng booking"
              value={d.totalBookings}
              color="#16A34A"
            />
            <KpiCard
              icon="today-outline"
              label="Booking hôm nay"
              value={d.todayBookings}
              color={PRIMARY}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="cash-outline"
              label="Doanh thu"
              value={`${(d.totalRevenue / 1000).toFixed(0)}k`}
              color="#2563EB"
            />
            <KpiCard
              icon="checkmark-circle-outline"
              label="Hoàn tất"
              value={`${d.completionRate}%`}
              color="#16A34A"
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="close-circle-outline"
              label="Hủy"
              value={`${d.cancelRate}%`}
              color="#DC2626"
            />
            <KpiCard
              icon="flag-outline"
              label="Hoàn thành"
              value={d.completedBookings}
              color="#6B7280"
            />
          </View>
        </View>
      );
    }

    // Users Tab
    if (activeTab === "users" && data.users) {
      const d = data.users;
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="people-outline"
              label="Tổng users"
              value={d.totalUsers}
              color="#2563EB"
            />
            <KpiCard
              icon="person-add-outline"
              label="Mới"
              value={d.newUsers}
              color="#16A34A"
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="person-remove-outline"
              label="Quay lại"
              value={d.returningUsers}
              color={PRIMARY}
            />
            <KpiCard
              icon="trending-up-outline"
              label="Giữ chân"
              value={
                d.totalUsers > 0
                  ? `${Math.round((d.returningUsers / d.totalUsers) * 100)}%`
                  : "0%"
              }
              color="#6B7280"
            />
          </View>
          {d.dailyActive?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Người dùng hoạt động theo ngày
              </Text>
              {d.dailyActive.map((da: any) =>
                renderBar(
                  da.date,
                  da.count,
                  Math.max(...d.dailyActive.map((x: any) => x.count), 1),
                ),
              )}
            </View>
          )}
        </View>
      );
    }

    // Search Tab
    if (activeTab === "search" && data.search) {
      const d = data.search;
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="search-outline"
              label="Tìm kiếm"
              value={d.totalSearches}
              color={PRIMARY}
            />
            <KpiCard
              icon="people-outline"
              label="User tìm"
              value={d.uniqueSearchUsers}
              color="#2563EB"
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Từ khóa phổ biến</Text>
            {d.topKeywords?.length > 0 ? (
              d.topKeywords.map((kw: any) =>
                renderBar(
                  kw.keyword,
                  kw.count,
                  d.topKeywords[0]?.count || 1,
                  "#E69A00",
                ),
              )
            ) : (
              <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
            )}
          </View>
        </View>
      );
    }

    // Funnel Tab
    if (activeTab === "funnel" && data.funnel) {
      const d = data.funnel;
      const stages = [
        { label: "Xem nhà hàng", value: d.funnel?.restaurantViews || 0 },
        { label: "Bắt đầu đặt", value: d.funnel?.bookingStarted || 0 },
        { label: "Đặt thành công", value: d.funnel?.bookingCompleted || 0 },
        { label: "Xác nhận", value: d.funnel?.bookingConfirmed || 0 },
      ];
      const maxVal = Math.max(...stages.map((s) => s.value), 1);
      return (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Phễu đặt bàn</Text>
          {stages.map((stage, i) => (
            <View key={stage.label}>
              <View style={styles.funnelRow}>
                <Text style={styles.funnelLabel}>{stage.label}</Text>
                <Text style={styles.funnelValue}>{stage.value}</Text>
              </View>
              <View
                style={[
                  styles.funnelBar,
                  {
                    width: `${(stage.value / maxVal) * 100}%`,
                    backgroundColor:
                      i === stages.length - 1 ? "#16A34A" : PRIMARY,
                  },
                ]}
              />
              {i < stages.length - 1 && d.funnelConversion && (
                <Text style={styles.conversionText}>
                  ▼{" "}
                  {d.funnelConversion[
                    ["viewToStart", "startToBook", "bookToConfirm"][i] || ""
                  ]}
                  %
                </Text>
              )}
            </View>
          ))}
        </View>
      );
    }

    // Tables Tab
    if (activeTab === "tables" && data.tables) {
      const d = data.tables;
      const types = [
        {
          key: "vip",
          label: "VIP",
          value: d.tableTypeRatio?.vip || 0,
          color: "#E69A00",
        },
        {
          key: "view",
          label: "View",
          value: d.tableTypeRatio?.view || 0,
          color: "#2563EB",
        },
        {
          key: "regular",
          label: "Regular",
          value: d.tableTypeRatio?.regular || 0,
          color: "#16A34A",
        },
        {
          key: "standard",
          label: "Standard",
          value: d.tableTypeRatio?.standard || 0,
          color: "#6B7280",
        },
      ];
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="star-outline"
              label="VIP"
              value={d.vipTableBookings}
              color="#E69A00"
            />
            <KpiCard
              icon="grid-outline"
              label="Standard"
              value={d.standardTableBookings}
              color="#6B7280"
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tỉ lệ loại bàn</Text>
            {types.map((t) => renderBar(t.label, t.value, 100, t.color))}
          </View>
        </View>
      );
    }

    // Cancellation Tab
    if (activeTab === "cancellation" && data.cancellation) {
      const d = data.cancellation;
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="close-circle-outline"
              label="Hủy"
              value={d.totalCancelled}
              color="#DC2626"
            />
            <KpiCard
              icon="eye-off-outline"
              label="No-show"
              value={d.totalNoShow}
              color="#E69A00"
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="trending-down-outline"
              label="Tỉ lệ hủy"
              value={`${d.cancelRate}%`}
              color="#DC2626"
            />
            <KpiCard
              icon="trending-up-outline"
              label="Tỉ lệ no-show"
              value={`${d.noShowRate}%`}
              color="#E69A00"
            />
          </View>
          {d.cancelReasons?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lý do hủy</Text>
              {d.cancelReasons.map((r: any) =>
                renderBar(
                  r.reason.length > 20
                    ? r.reason.slice(0, 20) + "..."
                    : r.reason,
                  r.count,
                  d.cancelReasons[0]?.count || 1,
                  "#DC2626",
                ),
              )}
            </View>
          )}
        </View>
      );
    }

    // AI Tab
    if (activeTab === "ai" && data.ai) {
      const d = data.ai;
      return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="chatbubbles-outline"
              label="Chat AI"
              value={d.totalChats}
              color={PRIMARY}
            />
            <KpiCard
              icon="people-outline"
              label="User AI"
              value={d.uniqueUsers}
              color="#2563EB"
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="checkmark-circle-outline"
              label="Đặt qua AI"
              value={d.completedBookings}
              color="#16A34A"
            />
            <KpiCard
              icon="trending-up-outline"
              label="Tỉ lệ CVR"
              value={`${d.conversionRate}%`}
              color={PRIMARY}
            />
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Phân tích</Text>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableIndicator
              key={p.key}
              label={p.label}
              isActive={period === p.key}
              onPress={() => setPeriod(p.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// KPI Card component
function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// Touchable period indicator
function TouchableIndicator({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.periodBtn, isActive && styles.periodBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  periodTextActive: { color: "#fff" },
  tabRow: {
    backgroundColor: "#fff",
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  content: { flex: 1, padding: 16 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiValue: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  kpiLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  barLabel: { fontSize: 12, color: "#374151", width: 100 },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 10 },
  barValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    width: 40,
    textAlign: "right",
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 20,
  },
  funnelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  funnelLabel: { fontSize: 13, color: "#374151" },
  funnelValue: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  funnelBar: { height: 24, borderRadius: 6, marginBottom: 2 },
  conversionText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 12,
    marginLeft: 4,
  },
});
