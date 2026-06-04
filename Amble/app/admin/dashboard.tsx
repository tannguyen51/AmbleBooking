import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { useAuthStore } from "../../store/authStore";
import { adminTheme } from "../../constants/adminTheme";
import { useTranslation } from "../../i18n/useTranslation";

const BG = adminTheme.colors.background;

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  partnersPending: number;
  partnersActive: number;
  restaurantsActive: number;
  bookingsToday: number;
  pendingPayments: number;
};

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  partnersPending: 0,
  partnersActive: 0,
  restaurantsActive: 0,
  bookingsToday: 0,
  pendingPayments: 0,
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const ACTIONS = [
    { label: t("admin.dashboard.partners"), icon: "business", path: "/admin/partners" },
    { label: t("admin.dashboard.restaurants"), icon: "restaurant", path: "/admin/restaurants" },
    { label: "Phân tích", icon: "stats-chart", path: "/admin/analytics" },
    { label: t("admin.dashboard.orders"), icon: "calendar", path: "/admin/bookings" },
    { label: t("admin.dashboard.routes"), icon: "map", path: "/admin/routes" },
  ];

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data?.stats || EMPTY_STATS);
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[adminTheme.colors.primary, adminTheme.colors.primaryContainer]}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>{t("admin.dashboard.title")}</Text>
          <Text style={styles.heroSubtitle}>
            {t("admin.dashboard.subtitle")}
          </Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label={t("admin.dashboard.statsUsers")} value={stats.totalUsers} />
            <StatCard label={t("admin.dashboard.statsActiveUsers")} value={stats.activeUsers} />
            <StatCard label={t("admin.dashboard.statsPendingPartners")} value={stats.partnersPending} />
            <StatCard label={t("admin.dashboard.statsActivePartners")} value={stats.partnersActive} />
            <StatCard label={t("admin.dashboard.statsRestaurants")} value={stats.restaurantsActive} />
            <StatCard label={t("admin.dashboard.statsOrders")} value={stats.bookingsToday} />
            <StatCard label={t("admin.dashboard.statsPendingPayments")} value={stats.pendingPayments} />
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("admin.dashboard.quickActions")}</Text>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.path as any)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name={action.icon as any}
                  size={18}
                  color={adminTheme.colors.primary}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out" size={16} color={adminTheme.colors.primary} />
          <Text style={styles.logoutText}>{t("admin.dashboard.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdminBottomNav />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 54,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
  },
  loadingWrap: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginTop: -22,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: adminTheme.colors.onSurface,
  },
  statLabel: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 4,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  actionCard: {
    width: "47%",
    backgroundColor: adminTheme.colors.surfaceLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: adminTheme.colors.surfaceVariant,
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
});
